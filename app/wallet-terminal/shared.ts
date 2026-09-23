import type { Address, Hash } from "viem";

export type FlowEvent = {
  id: string;
  at: string;
  message: string;
  tone: "info" | "success" | "error";
  hash?: Hash;
};

export type AddEvent = (
  message: string,
  tone?: FlowEvent["tone"],
  hash?: Hash,
) => void;

export type PreparedTransfer = {
  to: Address;
  value: bigint;
  gas: bigint;
};

export type PreparedApproval = {
  spender: Address;
  amount: bigint;
  displayAmount: string;
  action: "approve" | "revoke";
};

export function describeError(error: unknown) {
  if (!(error instanceof Error)) return "The wallet request failed.";

  const candidate = error as Error & {
    code?: number;
    shortMessage?: string;
  };
  if (candidate.code === 4001 || /reject|denied|cancelled/i.test(error.message)) {
    return "Request rejected in MetaMask.";
  }
  if (/insufficient funds/i.test(error.message)) {
    return "Insufficient ETH for the value and network fee.";
  }
  if (/not installed|provider|extension/i.test(error.message)) {
    return "MetaMask was not detected. Install or unlock the extension.";
  }
  return candidate.shortMessage ?? error.message;
}

export function shorten(value?: string, leading = 6, trailing = 4) {
  return value
    ? `${value.slice(0, leading)}…${value.slice(-trailing)}`
    : "—";
}

export function arbitrumExplorerUrl(path: "address" | "tx", value: string) {
  return `https://arbiscan.io/${path}/${value}`;
}
