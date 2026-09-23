"use client";

import { useReadContracts } from "wagmi";
import { arbitrum } from "wagmi/chains";
import { isAddress, zeroAddress, type Address } from "viem";
import { configuredCollateralAddress, erc20Abi } from "@/lib/erc20";

export function useCollateral(address?: Address, enabled = false) {
  const collateralAddress = isAddress(configuredCollateralAddress)
    ? configuredCollateralAddress
    : undefined;
  const contract = {
    address: collateralAddress ?? zeroAddress,
    abi: erc20Abi,
    chainId: arbitrum.id,
  } as const;
  const query = useReadContracts({
    contracts: [
      { ...contract, functionName: "name" },
      { ...contract, functionName: "symbol" },
      { ...contract, functionName: "decimals" },
      {
        ...contract,
        functionName: "balanceOf",
        args: address ? [address] : undefined,
      },
    ],
    allowFailure: false,
    query: {
      enabled: enabled && Boolean(address && collateralAddress),
    },
  });

  const [name, symbol, decimals, balance] = query.data ?? [];

  return {
    address: collateralAddress,
    name,
    symbol,
    decimals,
    balance,
    isLoading: query.isLoading,
    refetch: query.refetch,
  };
}
