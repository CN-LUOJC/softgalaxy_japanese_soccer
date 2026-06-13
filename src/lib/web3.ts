import { createConfig, http, fallback } from "wagmi";
import {
  mainnet,
  sepolia,
  polygon,
  bsc,
  arbitrum,
  optimism,
  base,
  avalanche,
} from "wagmi/chains";
import { injected, walletConnect } from "wagmi/connectors";
import { QueryClient } from "@tanstack/react-query";

// ---------------------------------------------------------------------------
// QueryClient — single instance, not recreated per render
// ---------------------------------------------------------------------------
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    },
  },
});

// ---------------------------------------------------------------------------
// Supported chain metadata (used by UI for display & validation)
// ---------------------------------------------------------------------------
export interface ChainMeta {
  id: number;
  name: string;
  currency: string;
  explorerUrl: string;
  isTestnet: boolean;
}

export const CHAIN_METADATA: Record<number, ChainMeta> = {
  [mainnet.id]: {
    id: mainnet.id,
    name: "Ethereum",
    currency: "ETH",
    explorerUrl: "https://etherscan.io",
    isTestnet: false,
  },
  [sepolia.id]: {
    id: sepolia.id,
    name: "Sepolia",
    currency: "SepoliaETH",
    explorerUrl: "https://sepolia.etherscan.io",
    isTestnet: true,
  },
  [polygon.id]: {
    id: polygon.id,
    name: "Polygon",
    currency: "MATIC",
    explorerUrl: "https://polygonscan.com",
    isTestnet: false,
  },
  [bsc.id]: {
    id: bsc.id,
    name: "BNB Chain",
    currency: "BNB",
    explorerUrl: "https://bscscan.com",
    isTestnet: false,
  },
  [arbitrum.id]: {
    id: arbitrum.id,
    name: "Arbitrum",
    currency: "ETH",
    explorerUrl: "https://arbiscan.io",
    isTestnet: false,
  },
  [optimism.id]: {
    id: optimism.id,
    name: "Optimism",
    currency: "ETH",
    explorerUrl: "https://optimistic.etherscan.io",
    isTestnet: false,
  },
  [base.id]: {
    id: base.id,
    name: "Base",
    currency: "ETH",
    explorerUrl: "https://basescan.org",
    isTestnet: false,
  },
  [avalanche.id]: {
    id: avalanche.id,
    name: "Avalanche",
    currency: "AVAX",
    explorerUrl: "https://snowtrace.io",
    isTestnet: false,
  },
};

export const SUPPORTED_CHAIN_IDS = new Set(
  Object.keys(CHAIN_METADATA).map(Number)
);

export function isChainSupported(chainId: number): boolean {
  return SUPPORTED_CHAIN_IDS.has(chainId);
}

// ---------------------------------------------------------------------------
// Address formatting
// ---------------------------------------------------------------------------
export function shortenAddress(
  address: string,
  chars: number = 4
): string {
  if (!address) return "";
  if (address.length <= chars * 2 + 2) return address;
  return `${address.slice(0, chars + 2)}…${address.slice(-chars)}`;
}

// ---------------------------------------------------------------------------
// wagmi config
// ---------------------------------------------------------------------------
const walletConnectProjectId =
  process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID;

export const config = createConfig({
  chains: [mainnet, sepolia, polygon, bsc, arbitrum, optimism, base, avalanche],
  connectors: [
    // Single injected() connector with shimDisconnect for ALL browser
    // wallets (MetaMask, OKX, Brave, etc.).  multiInjectedProviderDiscovery
    // is disabled to avoid event conflicts when switching chains.
    injected({ shimDisconnect: true }),
    ...(walletConnectProjectId
      ? [walletConnect({ projectId: walletConnectProjectId, showQrModal: true })]
      : []),
  ],
  multiInjectedProviderDiscovery: false,
  ssr: true,
  transports: {
    [mainnet.id]: fallback([
      http(
        process.env.NEXT_PUBLIC_ALCHEMY_RPC_URL ||
          `https://eth-mainnet.g.alchemy.com/v2/${process.env.NEXT_PUBLIC_ALCHEMY_API_KEY || "demo"}`
      ),
      http(),
    ]),
    [sepolia.id]: fallback([
      http(
        `https://sepolia.g.alchemy.com/v2/${process.env.NEXT_PUBLIC_ALCHEMY_API_KEY || "demo"}`
      ),
      http(),
    ]),
    [polygon.id]: fallback([
      http(
        process.env.NEXT_PUBLIC_POLYGON_RPC_URL ||
          "https://polygon-rpc.com"
      ),
      http(),
    ]),
    [bsc.id]: fallback([http("https://bsc-dataseed1.binance.org"), http()]),
    [arbitrum.id]: fallback([
      http("https://arb1.arbitrum.io/rpc"),
      http(),
    ]),
    [optimism.id]: fallback([
      http("https://mainnet.optimism.io"),
      http(),
    ]),
    [base.id]: fallback([http("https://mainnet.base.org"), http()]),
    [avalanche.id]: fallback([
      http("https://api.avax.network/ext/bc/C/rpc"),
      http(),
    ]),
  },
});
