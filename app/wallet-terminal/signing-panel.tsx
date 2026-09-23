"use client";

import { useMemo, useState } from "react";
import { useSignMessage, useSignTypedData } from "wagmi";
import { arbitrum } from "wagmi/chains";
import {
  parseUnits,
  verifyMessage,
  verifyTypedData,
  type Address,
  type Hex,
} from "viem";
import {
  buildPerpsOrderDomain,
  buildPerpsOrderMessage,
  perpsOrderTypes,
} from "@/lib/perps-order";
import { describeError, shorten, type AddEvent } from "./shared";

type SigningPanelProps = {
  address?: Address;
  isReady: boolean;
  addEvent: AddEvent;
};

function serializePayload(value: unknown) {
  return JSON.stringify(
    value,
    (_, candidate) =>
      typeof candidate === "bigint" ? candidate.toString() : candidate,
    2,
  );
}

export function SigningPanel({
  address,
  isReady,
  addEvent,
}: SigningPanelProps) {
  const [sessionSignature, setSessionSignature] = useState<Hex>();
  const [orderSignature, setOrderSignature] = useState<Hex>();
  const [market, setMarket] = useState("ETH-USD");
  const [side, setSide] = useState<"long" | "short">("long");
  const [size, setSize] = useState("0.01");
  const [limitPrice, setLimitPrice] = useState("2500");
  const [reduceOnly, setReduceOnly] = useState(false);
  const [nonce, setNonce] = useState("1");
  const [expiry, setExpiry] = useState("1893456000");
  const { signMessageAsync, isPending: isSigningMessage } = useSignMessage();
  const { signTypedDataAsync, isPending: isSigningOrder } =
    useSignTypedData();

  const orderPayload = useMemo(() => {
    if (!address || !market.trim()) return null;
    try {
      const message = buildPerpsOrderMessage({
        account: address,
        market,
        side,
        size: parseUnits(size, 8),
        limitPrice: parseUnits(limitPrice, 8),
        reduceOnly,
        nonce: BigInt(nonce),
        expiry: BigInt(expiry),
      });
      return {
        domain: buildPerpsOrderDomain(arbitrum.id),
        types: perpsOrderTypes,
        primaryType: "PerpsOrder" as const,
        message,
      };
    } catch {
      return null;
    }
  }, [
    address,
    expiry,
    limitPrice,
    market,
    nonce,
    reduceOnly,
    side,
    size,
  ]);

  const signSession = async () => {
    if (!address) return;
    const message = [
      "Perps Terminal Session",
      `Address: ${address}`,
      `Chain: ${arbitrum.id}`,
      `Nonce: ${crypto.randomUUID()}`,
    ].join("\n");

    try {
      addEvent("EIP-191 session signature requested");
      const signature = await signMessageAsync({ message });
      const verified = await verifyMessage({ address, message, signature });
      setSessionSignature(signature);
      addEvent(
        verified
          ? "Session signature verified locally"
          : "Session signature verification failed",
        verified ? "success" : "error",
      );
    } catch (error) {
      addEvent(describeError(error), "error");
    }
  };

  const signOrder = async () => {
    if (!address || !orderPayload) return;
    try {
      addEvent("EIP-712 perps order signature requested");
      const signature = await signTypedDataAsync(orderPayload);
      const verified = await verifyTypedData({
        address,
        ...orderPayload,
        signature,
      });
      setOrderSignature(signature);
      addEvent(
        verified
          ? "Typed perps order verified locally"
          : "Typed order verification failed",
        verified ? "success" : "error",
      );
    } catch (error) {
      addEvent(describeError(error), "error");
    }
  };

  return (
    <article className="panel">
      <p className="step-label">Authentication and orders</p>
      <h2>Signing lab</h2>
      <p className="muted">
        Prove account ownership or sign a protocol-agnostic EIP-712 order. No
        order is submitted.
      </p>

      <button
        className="button secondary full-width"
        onClick={signSession}
        disabled={!isReady || isSigningMessage}
      >
        {isSigningMessage ? "Check MetaMask…" : "Sign session challenge"}
      </button>
      {sessionSignature ? (
        <p className="result-line success">
          Verified EIP-191 · {shorten(sessionSignature, 12, 8)}
        </p>
      ) : null}

      <div className="divider" />

      <div className="form-grid">
        <label>
          Market
          <input
            value={market}
            onChange={(event) => setMarket(event.target.value)}
            placeholder="ETH-USD"
          />
        </label>
        <label>
          Side
          <select
            value={side}
            onChange={(event) =>
              setSide(event.target.value as "long" | "short")
            }
          >
            <option value="long">Long</option>
            <option value="short">Short</option>
          </select>
        </label>
        <label>
          Size
          <input
            inputMode="decimal"
            value={size}
            onChange={(event) => setSize(event.target.value)}
          />
        </label>
        <label>
          Limit price
          <input
            inputMode="decimal"
            value={limitPrice}
            onChange={(event) => setLimitPrice(event.target.value)}
          />
        </label>
        <label>
          Order nonce
          <input
            inputMode="numeric"
            value={nonce}
            onChange={(event) => setNonce(event.target.value)}
          />
        </label>
        <label>
          Expiry (Unix seconds)
          <input
            inputMode="numeric"
            value={expiry}
            onChange={(event) => setExpiry(event.target.value)}
          />
        </label>
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={reduceOnly}
            onChange={(event) => setReduceOnly(event.target.checked)}
          />
          Reduce only
        </label>
      </div>

      <details className="payload-preview">
        <summary>Typed order payload</summary>
        <pre>
          {orderPayload
            ? serializePayload(orderPayload)
            : "Enter a valid size, price, and expiry."}
        </pre>
      </details>

      <button
        className="button primary full-width"
        onClick={signOrder}
        disabled={!isReady || !orderPayload || isSigningOrder}
      >
        {isSigningOrder ? "Check MetaMask…" : "Sign typed order"}
      </button>
      {orderSignature ? (
        <p className="result-line success">
          Verified EIP-712 · {shorten(orderSignature, 12, 8)}
        </p>
      ) : null}
    </article>
  );
}
