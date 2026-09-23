import { parseAbi, type Address } from "viem";

export const ARBITRUM_USDC_ADDRESS: Address =
  "0xaf88d065e77c8cC2239327C5EDb3A432268e5831";

export const configuredCollateralAddress =
  process.env.NEXT_PUBLIC_COLLATERAL_TOKEN_ADDRESS?.trim() ||
  ARBITRUM_USDC_ADDRESS;

export const erc20Abi = parseAbi([
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function balanceOf(address owner) view returns (uint256)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)",
]);
