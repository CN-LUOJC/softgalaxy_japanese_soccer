import { createConfig, http, fallback } from "wagmi";
import {
  mainnet,
  sepolia,
  polygon,
  polygonAmoy,
  bsc,
  bscTestnet,
  arbitrum,
  arbitrumSepolia,
  optimism,
  optimismSepolia,
  base,
  baseSepolia,
  avalanche,
  avalancheFuji,
  holesky,
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
  // ── mainnets ──
  [mainnet.id]: {
    id: mainnet.id, name: "Ethereum", currency: "ETH",
    explorerUrl: "https://etherscan.io", isTestnet: false,
  },
  [polygon.id]: {
    id: polygon.id, name: "Polygon", currency: "MATIC",
    explorerUrl: "https://polygonscan.com", isTestnet: false,
  },
  [bsc.id]: {
    id: bsc.id, name: "BNB Chain", currency: "BNB",
    explorerUrl: "https://bscscan.com", isTestnet: false,
  },
  [arbitrum.id]: {
    id: arbitrum.id, name: "Arbitrum", currency: "ETH",
    explorerUrl: "https://arbiscan.io", isTestnet: false,
  },
  [optimism.id]: {
    id: optimism.id, name: "Optimism", currency: "ETH",
    explorerUrl: "https://optimistic.etherscan.io", isTestnet: false,
  },
  [base.id]: {
    id: base.id, name: "Base", currency: "ETH",
    explorerUrl: "https://basescan.org", isTestnet: false,
  },
  [avalanche.id]: {
    id: avalanche.id, name: "Avalanche", currency: "AVAX",
    explorerUrl: "https://snowtrace.io", isTestnet: false,
  },
  // ── testnets ──
  [sepolia.id]: {
    id: sepolia.id, name: "Sepolia", currency: "SepoliaETH",
    explorerUrl: "https://sepolia.etherscan.io", isTestnet: true,
  },
  [holesky.id]: {
    id: holesky.id, name: "Holesky", currency: "ETH",
    explorerUrl: "https://holesky.etherscan.io", isTestnet: true,
  },
  [polygonAmoy.id]: {
    id: polygonAmoy.id, name: "Polygon Amoy", currency: "MATIC",
    explorerUrl: "https://amoy.polygonscan.com", isTestnet: true,
  },
  [bscTestnet.id]: {
    id: bscTestnet.id, name: "BSC Testnet", currency: "tBNB",
    explorerUrl: "https://testnet.bscscan.com", isTestnet: true,
  },
  [arbitrumSepolia.id]: {
    id: arbitrumSepolia.id, name: "Arbitrum Sepolia", currency: "ETH",
    explorerUrl: "https://sepolia.arbiscan.io", isTestnet: true,
  },
  [optimismSepolia.id]: {
    id: optimismSepolia.id, name: "Optimism Sepolia", currency: "ETH",
    explorerUrl: "https://sepolia-optimism.etherscan.io", isTestnet: true,
  },
  [baseSepolia.id]: {
    id: baseSepolia.id, name: "Base Sepolia", currency: "ETH",
    explorerUrl: "https://sepolia.basescan.org", isTestnet: true,
  },
  [avalancheFuji.id]: {
    id: avalancheFuji.id, name: "Avalanche Fuji", currency: "AVAX",
    explorerUrl: "https://testnet.snowtrace.io", isTestnet: true,
  },
};

// CHAIN_METADATA is purely a display registry.  Chains not listed here
// are still fully usable — the UI simply falls back to "Chain ID: {id}".
// There is no "unsupported chain" concept; every EVM chain is accepted.

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
  chains: [
    mainnet, sepolia, holesky,
    polygon, polygonAmoy,
    bsc, bscTestnet,
    arbitrum, arbitrumSepolia,
    optimism, optimismSepolia,
    base, baseSepolia,
    avalanche, avalancheFuji,
  ],
  connectors: [
    // Explicit injected() with shimDisconnect — all browser-wallet
    // connections are routed through this connector so disconnect shim
    // and chain events work reliably regardless of which wallet the
    // user picks in the modal.
    injected({ shimDisconnect: true }),
    ...(walletConnectProjectId
      ? [walletConnect({ projectId: walletConnectProjectId, showQrModal: true })]
      : []),
  ],
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
    [baseSepolia.id]: fallback([http("https://sepolia.base.org"), http()]),
    [avalanche.id]: fallback([
      http("https://api.avax.network/ext/bc/C/rpc"),
      http(),
    ]),
    [avalancheFuji.id]: fallback([
      http("https://api.avax-test.network/ext/bc/C/rpc"),
      http(),
    ]),
    [holesky.id]: fallback([
      http(
        `https://eth-holesky.g.alchemy.com/v2/${process.env.NEXT_PUBLIC_ALCHEMY_API_KEY || "demo"}`
      ),
      http(),
    ]),
    [polygonAmoy.id]: fallback([
      http("https://rpc-amoy.polygon.technology"),
      http(),
    ]),
    [bscTestnet.id]: fallback([
      http("https://data-seed-prebsc-1-s1.binance.org:8545"),
      http(),
    ]),
    [arbitrumSepolia.id]: fallback([
      http("https://sepolia-rollup.arbitrum.io/rpc"),
      http(),
    ]),
    [optimismSepolia.id]: fallback([
      http("https://sepolia.optimism.io"),
      http(),
    ]),
  },
});
