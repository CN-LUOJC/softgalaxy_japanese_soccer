"use client";

import { WagmiProvider } from "wagmi";
import { QueryClientProvider } from "@tanstack/react-query";
import { config, queryClient } from "@/lib/web3";

/**
 * WalletProvider wraps the app with wagmi and react-query providers.
 *
 * Nesting order (required by wagmi v2):
 *   QueryClientProvider   ← provides async-state context to wagmi hooks
 *     WagmiProvider       ← provides wallet config & connector state
 *       {children}
 */
export function WalletProvider({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <WagmiProvider config={config}>{children}</WagmiProvider>
    </QueryClientProvider>
  );
}
