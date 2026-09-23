"use client";

import {
  useSwitchChain,
  useWeb3Auth,
  useWeb3AuthConnect,
  useWeb3AuthDisconnect,
} from "@web3auth/modal/react";
import { AUTH_CONNECTION, WALLET_CONNECTORS } from "@web3auth/modal";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { useChainId, useConnection } from "wagmi";
import { arbitrum } from "wagmi/chains";
import {
  arbitrumChainIdHex,
  googleAuthConnectionId,
  web3AuthEnvironment,
  web3AuthNetworkLabel,
} from "@/lib/web3auth";
import { ActivityLog } from "./wallet-terminal/activity-log";
import { CapabilityPanel } from "./wallet-terminal/capability-panel";
import {
  describeError,
  shorten,
  type FlowEvent,
} from "./wallet-terminal/shared";
import { SigningPanel } from "./wallet-terminal/signing-panel";
import { TransactionPanel } from "./wallet-terminal/transaction-panel";
import { WalletOverview } from "./wallet-terminal/wallet-overview";

type MetaMaskProvider = {
  isMetaMask?: boolean;
  on?: (event: string, listener: (...args: unknown[]) => void) => void;
  removeListener?: (
    event: string,
    listener: (...args: unknown[]) => void,
  ) => void;
};

function getMetaMaskProvider() {
  if (typeof window === "undefined") return undefined;
  return (window as typeof window & { ethereum?: MetaMaskProvider }).ethereum;
}

function subscribeToMetaMask(onStoreChange: () => void) {
  window.addEventListener("ethereum#initialized", onStoreChange);
  return () =>
    window.removeEventListener("ethereum#initialized", onStoreChange);
}

function getMetaMaskSnapshot() {
  return Boolean(getMetaMaskProvider()?.isMetaMask);
}

function subscribeToNothing() {
  return () => {};
}

function getIsLocalhostSnapshot() {
  const { hostname } = window.location;
  return hostname === "localhost" || hostname === "127.0.0.1";
}

export function WalletLab() {
  const { address, isConnected, connector } = useConnection();
  const chainId = useChainId();
  const { isInitialized, initError, status } = useWeb3Auth();
  const {
    connectTo,
    loading: isConnecting,
    error: connectError,
  } = useWeb3AuthConnect();
  const {
    disconnect,
    loading: isDisconnecting,
    error: disconnectError,
  } = useWeb3AuthDisconnect();
  const {
    switchChain,
    loading: isSwitching,
    error: switchError,
  } = useSwitchChain();
  const hasMetaMask = useSyncExternalStore(
    subscribeToMetaMask,
    getMetaMaskSnapshot,
    () => false,
  );
  const isLocalhost = useSyncExternalStore(
    subscribeToNothing,
    getIsLocalhostSnapshot,
    () => false,
  );
  const [events, setEvents] = useState<FlowEvent[]>([]);

  const addEvent = useCallback(
    (
      message: string,
      tone: FlowEvent["tone"] = "info",
      hash?: `0x${string}`,
    ) => {
      setEvents((current) =>
        [
          {
            id: crypto.randomUUID(),
            at: new Date().toLocaleTimeString(),
            message,
            tone,
            hash,
          },
          ...current,
        ].slice(0, 20),
      );
    },
    [],
  );

  useEffect(() => {
    const ethereum = getMetaMaskProvider();
    if (!ethereum?.on || !ethereum.removeListener) return;

    const onAccountsChanged = (...args: unknown[]) => {
      const accounts = args[0] as string[] | undefined;
      addEvent(
        accounts?.[0]
          ? `Active account changed to ${shorten(accounts[0])}`
          : "MetaMask removed account access",
        accounts?.[0] ? "success" : "info",
      );
    };
    const onChainChanged = (...args: unknown[]) => {
      const rawChainId = args[0];
      const nextChainId =
        typeof rawChainId === "string"
          ? Number.parseInt(rawChainId, 16)
          : Number(rawChainId);
      addEvent(
        nextChainId === arbitrum.id
          ? "Wallet changed to Arbitrum One"
          : `Wallet changed to chain ${nextChainId}`,
        nextChainId === arbitrum.id ? "success" : "info",
      );
    };

    ethereum.on("accountsChanged", onAccountsChanged);
    ethereum.on("chainChanged", onChainChanged);
    return () => {
      ethereum.removeListener?.("accountsChanged", onAccountsChanged);
      ethereum.removeListener?.("chainChanged", onChainChanged);
    };
  }, [addEvent]);

  // The SDK resolves connectTo() only after both CONNECTED and AUTHORIZED
  // arrive, and several failure paths emit neither. Surfacing the raw status
  // makes a stalled handshake visible instead of an indefinite "Connecting…".
  const lastStatus = useRef<string | null>(null);
  useEffect(() => {
    if (!status || lastStatus.current === status) return;
    lastStatus.current = status;
    addEvent(`Web3Auth status: ${status}`);
  }, [status, addEvent]);

  const errorMessage = useMemo(() => {
    const error = initError ?? connectError ?? disconnectError ?? switchError;
    return error ? describeError(error) : null;
  }, [initError, connectError, disconnectError, switchError]);

  const connectMetaMask = async () => {
    addEvent("MetaMask connection requested through Web3Auth");
    // The hook swallows failures into its `error` state and resolves with
    // undefined, so the returned provider is the only reliable success signal.
    const provider = await connectTo(WALLET_CONNECTORS.METAMASK);
    if (provider) addEvent("MetaMask connected through Web3Auth", "success");
  };

  const connectGoogle = async () => {
    addEvent(`Google login requested (${googleAuthConnectionId})`);
    const provider = await connectTo(WALLET_CONNECTORS.AUTH, {
      authConnection: AUTH_CONNECTION.GOOGLE,
      authConnectionId: googleAuthConnectionId,
    });
    if (provider) {
      addEvent("Google connected through custom Auth Connection", "success");
    }
  };

  const switchToArbitrum = async () => {
    try {
      addEvent("Arbitrum network switch requested");
      await switchChain(arbitrumChainIdHex);
      addEvent("Switched to Arbitrum One", "success");
    } catch (error) {
      addEvent(describeError(error), "error");
    }
  };

  const disconnectMetaMask = async () => {
    try {
      await disconnect();
      addEvent("Wallet session disconnected", "success");
    } catch (error) {
      addEvent(describeError(error), "error");
    }
  };

  const isArbitrum = isConnected && chainId === arbitrum.id;
  const isReady = Boolean(address) && isArbitrum;
  const networkMismatch =
    isLocalhost && web3AuthEnvironment === "mainnet";

  return (
    <main className="shell terminal-shell">
      <header className="hero">
        <div>
          <p className="eyebrow">Web3Auth × Wagmi × Arbitrum</p>
          <h1>Perps wallet terminal reference</h1>
          <p className="lede">
            A protocol-agnostic integration lab for wallet sessions, collateral,
            typed orders, simulations, approvals, and transaction receipts.
          </p>
        </div>
        <div className="hero-status">
          <div className={`network-pill env ${networkMismatch ? "warn" : ""}`}>
            <span />
            {web3AuthNetworkLabel}
          </div>
          <div className={`network-pill ${isArbitrum ? "ready" : ""}`}>
            <span />
            {isArbitrum ? "Arbitrum ready" : "Arbitrum required"}
          </div>
        </div>
      </header>

      {networkMismatch ? (
        <p className="callout">
          Sapphire Mainnet rejects localhost origins. Use the Devnet project
          locally; this does not change the Arbitrum chain used for transactions.
        </p>
      ) : null}

      <section className="session-bar panel">
        <div>
          <p className="step-label">Wallet session</p>
          <strong>
            {isConnected
              ? `${connector?.name ?? "Wallet"} · ${shorten(address)}`
              : isInitialized
                ? "No wallet connected"
                : "Initializing Web3Auth…"}
          </strong>
        </div>
        <div className="button-row session-actions">
          {!isConnected ? (
            <>
              <button
                className="button primary"
                onClick={connectMetaMask}
                disabled={!isInitialized || isConnecting || !hasMetaMask}
              >
                {isConnecting ? "Connecting…" : "Connect MetaMask"}
              </button>
              <button
                className="button secondary"
                onClick={connectGoogle}
                disabled={!isInitialized || isConnecting}
              >
                {isConnecting ? "Connecting…" : "Login with Google"}
              </button>
            </>
          ) : (
            <>
              {!isArbitrum ? (
                <button
                  className="button primary"
                  onClick={switchToArbitrum}
                  disabled={isSwitching}
                >
                  {isSwitching ? "Switching…" : "Switch to Arbitrum"}
                </button>
              ) : null}
              <button
                className="button ghost"
                onClick={disconnectMetaMask}
                disabled={isDisconnecting}
              >
                {isDisconnecting ? "Disconnecting…" : "Disconnect"}
              </button>
            </>
          )}
        </div>
        {errorMessage ? <p className="inline-error">{errorMessage}</p> : null}
      </section>

      <section className="terminal-grid">
        <WalletOverview
          address={address}
          chainId={chainId}
          isConnected={isConnected}
          hasMetaMask={hasMetaMask}
          addEvent={addEvent}
        />
        <SigningPanel
          key={`signing-${address ?? "disconnected"}-${chainId}`}
          address={address}
          isReady={isReady}
          addEvent={addEvent}
        />
        <TransactionPanel
          key={`transactions-${address ?? "disconnected"}-${chainId}`}
          address={address}
          isReady={isReady}
          addEvent={addEvent}
        />
        <CapabilityPanel
          hasMetaMask={hasMetaMask}
          isConnected={isConnected}
          isArbitrum={isArbitrum}
        />
        <ActivityLog events={events} />
      </section>

      <footer>
        Typed orders are templates only. A production terminal must provide a
        protocol-specific schema, nonce source, risk checks, relayer, and
        settlement adapter.
      </footer>
    </main>
  );
}
