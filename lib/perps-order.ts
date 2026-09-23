import {
  keccak256,
  stringToHex,
  type Address,
  type TypedDataDomain,
} from "viem";

export type PerpsOrderInput = {
  account: Address;
  market: string;
  side: "long" | "short";
  size: bigint;
  limitPrice: bigint;
  reduceOnly: boolean;
  nonce: bigint;
  expiry: bigint;
};

export const perpsOrderTypes = {
  PerpsOrder: [
    { name: "account", type: "address" },
    { name: "market", type: "bytes32" },
    { name: "side", type: "uint8" },
    { name: "size", type: "uint256" },
    { name: "limitPrice", type: "uint256" },
    { name: "reduceOnly", type: "bool" },
    { name: "nonce", type: "uint256" },
    { name: "expiry", type: "uint64" },
  ],
} as const;

export function buildPerpsOrderDomain(chainId: number): TypedDataDomain {
  return {
    name: "Perps Terminal Reference",
    version: "1",
    chainId,
  };
}

export function buildPerpsOrderMessage(input: PerpsOrderInput) {
  return {
    account: input.account,
    market: keccak256(stringToHex(input.market.trim().toUpperCase())),
    side: input.side === "long" ? 0 : 1,
    size: input.size,
    limitPrice: input.limitPrice,
    reduceOnly: input.reduceOnly,
    nonce: input.nonce,
    expiry: input.expiry,
  } as const;
}
