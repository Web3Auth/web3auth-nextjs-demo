import {
  CHAIN_NAMESPACES,
  WALLET_CONNECTORS,
  WEB3AUTH_NETWORK,
  type CustomChainConfig,
  type Web3AuthOptions,
} from "@web3auth/modal";
import type { Web3AuthContextConfig } from "@web3auth/modal/react";
import { numberToHex, type Chain } from "viem";
import { arbitrum, mainnet } from "wagmi/chains";

export type Web3AuthEnvironment = "devnet" | "mainnet";

// Public demo Client ID from web3auth-examples nextjs-quick-start.
// This project is Sapphire Devnet only. Do not send it to mainnet.
const EXAMPLES_DEVNET_CLIENT_ID =
  "BHgArYmWwSeq21czpcarYh0EVq2WWOzflX-NTK-tY1-1pauPzHKRRLgpABkmYiIV_og9jAvoIxQ8L3Smrwe04Lw";

// Next.js inlines NEXT_PUBLIC_* at build time, so each variable must be read
// as a literal property rather than through a computed key.
function resolveEnvironment(): Web3AuthEnvironment {
  const override = process.env.NEXT_PUBLIC_WEB3AUTH_NETWORK?.trim().toLowerCase();
  if (override === "mainnet" || override === "devnet") return override;

  // Vercel sets this automatically for production and preview deployments.
  // Previews stay on devnet because their generated URLs cannot be allowlisted.
  return process.env.NEXT_PUBLIC_VERCEL_ENV === "production"
    ? "mainnet"
    : "devnet";
}

export const web3AuthEnvironment = resolveEnvironment();

export const web3AuthNetworkLabel =
  web3AuthEnvironment === "mainnet" ? "Sapphire Mainnet" : "Sapphire Devnet";

function resolveClientId(environment: Web3AuthEnvironment) {
  const explicit = process.env.NEXT_PUBLIC_WEB3AUTH_CLIENT_ID?.trim();
  if (explicit) return explicit;

  if (environment === "mainnet") {
    return process.env.NEXT_PUBLIC_WEB3AUTH_CLIENT_ID_MAINNET?.trim() ?? "";
  }

  return (
    process.env.NEXT_PUBLIC_WEB3AUTH_CLIENT_ID_DEVNET?.trim() ||
    EXAMPLES_DEVNET_CLIENT_ID
  );
}

export const web3AuthClientId = resolveClientId(web3AuthEnvironment);

// Auth Connection ID of the dashboard custom Google connection.
// The public examples Client ID uses `w3a-google-demo`.
export const googleAuthConnectionId =
  process.env.NEXT_PUBLIC_WEB3AUTH_GOOGLE_AUTH_CONNECTION_ID?.trim() ||
  "w3a-google-demo";

function toWeb3AuthChain(chain: Chain, logo: string): CustomChainConfig {
  return {
    chainNamespace: CHAIN_NAMESPACES.EIP155,
    chainId: numberToHex(chain.id),
    rpcTarget: chain.rpcUrls.default.http[0],
    displayName: chain.name,
    blockExplorerUrl: chain.blockExplorers?.default.url ?? "",
    ticker: chain.nativeCurrency.symbol,
    tickerName: chain.nativeCurrency.name,
    decimals: chain.nativeCurrency.decimals,
    logo,
  };
}

export const arbitrumChainIdHex = numberToHex(arbitrum.id);

// Declared in code because a `chains` array replaces the dashboard chain list,
// and the shared demo project is not guaranteed to include Arbitrum One.
// Mainnet is kept so the wrong-chain flow stays reachable.
const chains = [
  toWeb3AuthChain(arbitrum, "https://cryptologos.cc/logos/arbitrum-arb-logo.png"),
  toWeb3AuthChain(mainnet, "https://cryptologos.cc/logos/ethereum-eth-logo.png"),
];

const web3AuthOptions: Web3AuthOptions = {
  clientId: web3AuthClientId,
  web3AuthNetwork:
    web3AuthEnvironment === "mainnet"
      ? WEB3AUTH_NETWORK.SAPPHIRE_MAINNET
      : WEB3AUTH_NETWORK.SAPPHIRE_DEVNET,
  chains,
  defaultChainId: arbitrumChainIdHex,
  // The dashboard project enables smart accounts but only lists AA chains it
  // knows about. Because `chains` above adds Arbitrum One, the wallet services
  // frame tries to build a smart account for it, throws
  // "Account Abstraction is not supported for the chain 0xa4b1", and aborts its
  // setup. The frame then never answers the session-login request, so
  // connectTo() hangs forever with no error. Supplying the Arbitrum bundler
  // here is merged into the dashboard config and keeps the frame alive.
  accountAbstractionConfig: {
    chains: [
      {
        chainId: arbitrumChainIdHex,
        bundlerConfig: {
          url: `https://api.web3auth.io/infura-service/v1/${arbitrumChainIdHex}/${web3AuthClientId}`,
        },
      },
    ],
  },
  enableLogging: process.env.NODE_ENV !== "production",
  // A supplied modalConfig replaces the SDK default instead of merging, and the
  // SDK dereferences connectors.auth without a guard. The modal is never opened,
  // but this still decides which connectors get initialized: `showOnModal: false`
  // leaves a connector NOT_READY and connectTo() on it throws.
  modalConfig: {
    hideWalletDiscovery: true,
    connectors: {
      [WALLET_CONNECTORS.AUTH]: {
        label: "Embedded wallet",
        showOnModal: true,
      },
    },
  },
};

export const web3AuthContextConfig: Web3AuthContextConfig = {
  web3AuthOptions,
};
