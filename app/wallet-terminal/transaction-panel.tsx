"use client";

import { useState } from "react";
import {
  usePublicClient,
  useReadContract,
  useSendTransaction,
  useWriteContract,
} from "wagmi";
import { arbitrum } from "wagmi/chains";
import {
  formatUnits,
  isAddress,
  parseEther,
  parseUnits,
  type Address,
  type Hash,
} from "viem";
import { erc20Abi } from "@/lib/erc20";
import {
  describeError,
  shorten,
  type AddEvent,
  type PreparedApproval,
  type PreparedTransfer,
} from "./shared";
import { useCollateral } from "./use-collateral";

type TransactionPanelProps = {
  address?: Address;
  isReady: boolean;
  addEvent: AddEvent;
};

export function TransactionPanel({
  address,
  isReady,
  addEvent,
}: TransactionPanelProps) {
  const publicClient = usePublicClient({ chainId: arbitrum.id });
  const collateral = useCollateral(address, isReady);
  const collateralAddress = collateral.address;
  const [recipient, setRecipient] = useState("");
  const [transferAmount, setTransferAmount] = useState("");
  const [spender, setSpender] = useState("");
  const [approvalAmount, setApprovalAmount] = useState("");
  const [preparedTransfer, setPreparedTransfer] =
    useState<PreparedTransfer>();
  const [preparedApproval, setPreparedApproval] =
    useState<PreparedApproval>();
  const [lastHash, setLastHash] = useState<Hash>();
  const [isPreparingTransfer, setIsPreparingTransfer] = useState(false);
  const [isPreparingApproval, setIsPreparingApproval] = useState(false);
  const { mutateAsync: sendTransaction, isPending: isSending } =
    useSendTransaction();
  const { mutateAsync: writeContract, isPending: isWriting } =
    useWriteContract();
  const validSpender = isAddress(spender) ? spender : undefined;
  const allowance = useReadContract({
    address: collateralAddress,
    abi: erc20Abi,
    functionName: "allowance",
    args: address && validSpender ? [address, validSpender] : undefined,
    chainId: arbitrum.id,
    query: {
      enabled: isReady && Boolean(address && collateralAddress && validSpender),
    },
  });

  const updateRecipient = (value: string) => {
    setRecipient(value);
    setPreparedTransfer(undefined);
  };

  const updateTransferAmount = (value: string) => {
    setTransferAmount(value);
    setPreparedTransfer(undefined);
  };

  const updateSpender = (value: string) => {
    setSpender(value);
    setPreparedApproval(undefined);
  };

  const updateApprovalAmount = (value: string) => {
    setApprovalAmount(value);
    setPreparedApproval(undefined);
  };

  const prepareTransfer = async () => {
    if (!address || !publicClient || !isAddress(recipient)) return;
    setIsPreparingTransfer(true);
    setLastHash(undefined);
    try {
      const value = parseEther(transferAmount);
      if (value <= BigInt(0))
        throw new Error("Transfer amount must be greater than zero.");
      const to = recipient as Address;
      const [, gas] = await Promise.all([
        publicClient.call({ account: address, to, value }),
        publicClient.estimateGas({ account: address, to, value }),
      ]);
      setPreparedTransfer({ to, value, gas });
      addEvent("Native transfer simulated and prepared", "success");
    } catch (error) {
      setPreparedTransfer(undefined);
      addEvent(describeError(error), "error");
    } finally {
      setIsPreparingTransfer(false);
    }
  };

  const confirmTransfer = async () => {
    if (!preparedTransfer) return;
    try {
      addEvent("Native transfer confirmation requested");
      const hash = await sendTransaction({
        ...preparedTransfer,
        chainId: arbitrum.id,
      });
      setLastHash(hash);
      addEvent("Native transfer broadcast", "info", hash);
      const receipt = await publicClient?.waitForTransactionReceipt({ hash });
      if (receipt?.status === "success") {
        addEvent("Native transfer confirmed", "success", hash);
        setPreparedTransfer(undefined);
      } else {
        addEvent("Native transfer reverted", "error", hash);
      }
    } catch (error) {
      addEvent(describeError(error), "error");
    }
  };

  const prepareApproval = async (action: "approve" | "revoke") => {
    if (
      !address ||
      !publicClient ||
      !collateralAddress ||
      !validSpender ||
      collateral.decimals === undefined ||
      !collateral.symbol
    ) {
      return;
    }
    setIsPreparingApproval(true);
    setLastHash(undefined);
    try {
      const amount =
        action === "revoke"
          ? BigInt(0)
          : parseUnits(approvalAmount, collateral.decimals);
      if (action === "approve" && amount <= BigInt(0)) {
        throw new Error("Approval amount must be greater than zero.");
      }
      await publicClient.simulateContract({
        account: address,
        address: collateralAddress,
        abi: erc20Abi,
        functionName: "approve",
        args: [validSpender, amount],
      });
      setPreparedApproval({
        spender: validSpender,
        amount,
        displayAmount:
          action === "revoke"
            ? "0"
            : `${approvalAmount} ${collateral.symbol}`,
        action,
      });
      addEvent(
        `${action === "revoke" ? "Revoke" : "Approval"} simulated and prepared`,
        "success",
      );
    } catch (error) {
      setPreparedApproval(undefined);
      addEvent(describeError(error), "error");
    } finally {
      setIsPreparingApproval(false);
    }
  };

  const confirmApproval = async () => {
    if (!preparedApproval || !collateralAddress) return;
    try {
      addEvent(
        `${preparedApproval.action === "revoke" ? "Revoke" : "Approval"} confirmation requested`,
      );
      const hash = await writeContract({
        account: address,
        address: collateralAddress,
        abi: erc20Abi,
        functionName: "approve",
        args: [preparedApproval.spender, preparedApproval.amount],
        chainId: arbitrum.id,
      });
      setLastHash(hash);
      addEvent("Approval transaction broadcast", "info", hash);
      const receipt = await publicClient?.waitForTransactionReceipt({ hash });
      if (receipt?.status === "success") {
        addEvent("Allowance update confirmed", "success", hash);
        setPreparedApproval(undefined);
        await allowance.refetch();
        await collateral.refetch();
      } else {
        addEvent("Allowance update reverted", "error", hash);
      }
    } catch (error) {
      addEvent(describeError(error), "error");
    }
  };

  const allowanceLabel =
    allowance.data !== undefined && collateral.decimals !== undefined
      ? `${Number(
          formatUnits(allowance.data, collateral.decimals),
        ).toLocaleString(undefined, { maximumFractionDigits: 4 })} ${
          collateral.symbol
        }`
      : "—";

  return (
    <article className="panel">
      <p className="step-label">Guarded mainnet writes</p>
      <h2>Transaction lab</h2>
      <p className="safety-callout">
        These controls broadcast real Arbitrum One transactions. Preparation
        never sends; the second confirmation does.
      </p>

      <section className="transaction-section">
        <h3>Native transfer</h3>
        <label>
          Recipient
          <input
            value={recipient}
            onChange={(event) => updateRecipient(event.target.value)}
            placeholder="0x…"
            spellCheck={false}
          />
        </label>
        <label>
          ETH amount
          <input
            inputMode="decimal"
            value={transferAmount}
            onChange={(event) => updateTransferAmount(event.target.value)}
            placeholder="0.001"
          />
        </label>
        {preparedTransfer ? (
          <div className="confirmation-card">
            <strong>Ready to broadcast</strong>
            <span>
              {formatUnits(preparedTransfer.value, 18)} ETH to{" "}
              {shorten(preparedTransfer.to)}
            </span>
            <span>Estimated gas: {preparedTransfer.gas.toString()}</span>
            <button
              className="button danger full-width"
              onClick={confirmTransfer}
              disabled={isSending}
            >
              {isSending ? "Check MetaMask…" : "Confirm real transfer"}
            </button>
          </div>
        ) : (
          <button
            className="button secondary full-width"
            onClick={prepareTransfer}
            disabled={
              !isReady ||
              !isAddress(recipient) ||
              !transferAmount ||
              isPreparingTransfer
            }
          >
            {isPreparingTransfer ? "Simulating…" : "Prepare transfer"}
          </button>
        )}
      </section>

      <div className="divider" />

      <section className="transaction-section">
        <h3>Collateral allowance</h3>
        <label>
          Protocol spender
          <input
            value={spender}
            onChange={(event) => updateSpender(event.target.value)}
            placeholder="0x…"
            spellCheck={false}
          />
        </label>
        <p className="field-note">Current allowance: {allowanceLabel}</p>
        <label>
          Approval amount ({collateral.symbol ?? "token"})
          <input
            inputMode="decimal"
            value={approvalAmount}
            onChange={(event) => updateApprovalAmount(event.target.value)}
            placeholder="100"
          />
        </label>
        {preparedApproval ? (
          <div className="confirmation-card">
            <strong>
              {preparedApproval.action === "revoke"
                ? "Ready to revoke"
                : "Ready to approve"}
            </strong>
            <span>
              {preparedApproval.displayAmount} for{" "}
              {shorten(preparedApproval.spender)}
            </span>
            <button
              className="button danger full-width"
              onClick={confirmApproval}
              disabled={isWriting}
            >
              {isWriting ? "Check MetaMask…" : "Confirm allowance update"}
            </button>
          </div>
        ) : (
          <div className="button-row">
            <button
              className="button secondary"
              onClick={() => prepareApproval("approve")}
              disabled={
                !isReady ||
                !validSpender ||
                !approvalAmount ||
                isPreparingApproval
              }
            >
              {isPreparingApproval ? "Simulating…" : "Prepare approval"}
            </button>
            <button
              className="button ghost"
              onClick={() => prepareApproval("revoke")}
              disabled={!isReady || !validSpender || isPreparingApproval}
            >
              Prepare revoke
            </button>
          </div>
        )}
      </section>

      {lastHash ? (
        <p className="result-line">Latest transaction: {shorten(lastHash, 12, 8)}</p>
      ) : null}
    </article>
  );
}
