"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Web3AuthProvider } from "@web3auth/modal/react";
import { WagmiProvider } from "@web3auth/modal/react/wagmi";
import { useState, type ReactNode } from "react";
import {
  web3AuthClientId,
  web3AuthContextConfig,
  web3AuthNetworkLabel,
} from "@/lib/web3auth";

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  if (!web3AuthClientId) {
    return (
      <main className="setup-shell">
        <section className="setup-card">
          <p className="eyebrow">Configuration required</p>
          <h1>Add your Web3Auth client ID</h1>
          <p>
            This environment resolves to{" "}
            <strong>{web3AuthNetworkLabel}</strong>. Local and preview use the
            public web3auth-examples Devnet Client ID. Production needs{" "}
            <code>NEXT_PUBLIC_WEB3AUTH_CLIENT_ID_MAINNET</code> from a Sapphire
            Mainnet dashboard project.
          </p>
        </section>
      </main>
    );
  }

  return (
    <Web3AuthProvider config={web3AuthContextConfig}>
      <QueryClientProvider client={queryClient}>
        <WagmiProvider>{children}</WagmiProvider>
      </QueryClientProvider>
    </Web3AuthProvider>
  );
}
