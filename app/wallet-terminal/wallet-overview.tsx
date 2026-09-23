"use client";

import {
  useBalance,
  useBlockNumber,
  useCapabilities,
  useEstimateFeesPerGas,
  useTransactionCount,
  useWatchAsset,
} from "wagmi";
import { arbitrum } from "wagmi/chains";
import {
  formatEther,
  formatGwei,
  formatUnits,
  type Address,
} from "viem";
import { arbitrumExplorerUrl, describeError, shorten, type AddEvent } from "./shared";
import { useCollateral } from "./use-collateral";

type WalletOverviewProps = {
  address?: Address;
  chainId: number;
  isConnected: boolean;
  hasMetaMask: boolean;
  addEvent: AddEvent;
};

function displayNumber(value?: bigint, decimals = 18, precision = 5) {
  if (value === undefined) return "—";
  return Number(formatUnits(value, decimals)).toLocaleString(undefined, {
    maximumFractionDigits: precision,
  });
}

export function WalletOverview({
  address,
  chainId,
  isConnected,
  hasMetaMask,
  addEvent,
}: WalletOverviewProps) {
  const isArbitrum = isConnected && chainId === arbitrum.id;
  const enabled = Boolean(address) && isArbitrum;
  const collateral = useCollateral(address, enabled);
  const nativeBalance = useBalance({
    address,
    chainId: arbitrum.id,
    query: { enabled },
  });
  const blockNumber = useBlockNumber({
    chainId: arbitrum.id,
    watch: true,
    query: { enabled: isArbitrum },
  });
  const transactionCount = useTransactionCount({
    address,
    chainId: arbitrum.id,
    query: { enabled },
  });
  const fees = useEstimateFeesPerGas({
    chainId: arbitrum.id,
    query: { enabled: isArbitrum },
  });
  const capabilities = useCapabilities({
    account: address,
    chainId: arbitrum.id,
    query: { enabled },
  });
  const { mutateAsync: watchAsset, isPending: isWatchingAsset } = useWatchAsset();

  const addCollateral = async () => {
    if (!collateral.address || !collateral.symbol || collateral.decimals === undefined)
      return;
    try {
      await watchAsset({
        type: "ERC20",
        options: {
          address: collateral.address,
          symbol: collateral.symbol,
          decimals: collateral.decimals,
        },
      });
      addEvent(`${collateral.symbol} added to MetaMask`, "success");
    } catch (error) {
      addEvent(describeError(error), "error");
    }
  };

  const advertisedCapabilities = capabilities.data
    ? Object.keys(capabilities.data).length
    : 0;

  return (
    <article className="panel span-two">
      <div className="panel-heading">
        <div>
          <p className="step-label">Wallet and chain reads</p>
          <h2>Execution account</h2>
        </div>
        <span className={`status-dot ${isArbitrum ? "online" : ""}`} />
      </div>

      <dl className="metric-grid">
        <div>
          <dt>Account</dt>
          <dd>
            {address ? (
              <a
                href={arbitrumExplorerUrl("address", address)}
                target="_blank"
                rel="noreferrer"
                title={address}
              >
                {shorten(address)}
              </a>
            ) : (
              "—"
            )}
          </dd>
        </div>
        <div>
          <dt>Chain</dt>
          <dd>{isArbitrum ? "Arbitrum One" : isConnected ? chainId : "—"}</dd>
        </div>
        <div>
          <dt>ETH balance</dt>
          <dd>
            {nativeBalance.data
              ? Number(formatEther(nativeBalance.data.value)).toFixed(5)
              : "—"}
          </dd>
        </div>
        <div>
          <dt>Collateral</dt>
          <dd>
            {collateral.balance !== undefined && collateral.decimals !== undefined
              ? `${displayNumber(
                  collateral.balance,
                  collateral.decimals,
                  4,
                )} ${collateral.symbol}`
              : "—"}
          </dd>
        </div>
        <div>
          <dt>Latest block</dt>
          <dd>{blockNumber.data?.toLocaleString() ?? "—"}</dd>
        </div>
        <div>
          <dt>Account nonce</dt>
          <dd>{transactionCount.data?.toString() ?? "—"}</dd>
        </div>
        <div>
          <dt>Max fee</dt>
          <dd>
            {fees.data?.maxFeePerGas
              ? `${Number(formatGwei(fees.data.maxFeePerGas)).toFixed(3)} gwei`
              : "—"}
          </dd>
        </div>
        <div>
          <dt>Wallet capabilities</dt>
          <dd>
            {advertisedCapabilities > 0
              ? `${advertisedCapabilities} advertised`
              : enabled
                ? "Standard EIP-1193"
                : "—"}
          </dd>
        </div>
      </dl>

      <div className="inline-actions">
        <button
          className="button secondary compact"
          onClick={addCollateral}
          disabled={!collateral.symbol || isWatchingAsset}
        >
          {isWatchingAsset
            ? "Check MetaMask…"
            : `Add ${collateral.symbol ?? "collateral"} token`}
        </button>
        <span className="field-note">
          {collateral.name ?? "Collateral token"} ·{" "}
          {collateral.address
            ? shorten(collateral.address)
            : "invalid configuration"}
        </span>
      </div>

      {!hasMetaMask ? (
        <p className="inline-error">MetaMask is not installed in this browser.</p>
      ) : null}
    </article>
  );
}
