# Wallet Integration — Implementation Document

## 1. Architecture Decisions

### Provider Hierarchy
The wallet provider is layered in a specific order required by wagmi v2:
```
QueryClientProvider  →  WagmiProvider  →  CartProvider  →  App
```
`@tanstack/react-query` must be the outermost ancestor because wagmi internally depends on it for async state management. A dedicated `WalletProvider.tsx` client component wraps both providers, isolating the `"use client"` boundary from the root layout (which remains a Server Component). This keeps the entire layout tree SSR-compatible except for the wallet context.

### State Management
All wallet state is managed by wagmi hooks (`useAccount`, `useChainId`, `useBalance`, `useEnsName`, `useDisconnect`, `useSignMessage`). No custom React Context or reducer is needed — wagmi is the single source of truth. The only local component state is UI-related: dropdown open/close, modal visibility, copy-feedback, and signing state.

### Component Split
- **`WalletButton`** — the only entry point rendered in the Header. Handles disconnected state, connected state, dropdown menu, authentication flow, and network display.
- **`WalletModal`** — wallet selection overlay with two options: "Browser Wallet" (routes through `injected()` connector) and "WalletConnect". Rendered via `createPortal` into `document.body` to avoid CSS containment issues with `backdrop-blur` on parent elements.
- **`WalletErrorBoundary`** — class component wrapping WalletButton. If any wallet hook throws, the error doesn't propagate to the Header or crash the page. Shows a retry button as fallback.
- **`useJPSoccerSignMessage`** — custom hook that wraps wagmi's `useSignMessage` to provide a branded signing interface. The signed message `"Sign in to JP Soccer"` is automatically requested once after a fresh wallet connection, making signing part of the authentication flow rather than a separate manual step.

### Connection Authentication Flow
1. User clicks "Connect Wallet" → modal appears
2. User selects "Browser Wallet" → `injected({ shimDisconnect: true })` connector is used
3. Wallet extension popup → user approves connection
4. Modal closes → 600ms delay → **auto-triggers signing** with `"Sign in to JP Soccer"`
5. Wallet signing popup → user signs → dropdown shows green `Authenticated` badge + signature hex
6. If user rejects the signature → dropdown shows "Sign in to complete authentication" button for manual retry

After page refresh, wagmi's `autoConnect` restores the connection but does **not** re-prompt for signature (the auto-sign only fires on fresh connections).

### Network Detection
Chain ID detection uses a dual approach:
- **Primary:** wagmi's `useChainId()` hook listens for standard `chainChanged` EIP-1193 events
- **Fallback:** a 2-second polling interval calls `window.ethereum.request({ method: 'eth_chainId' })` directly, ensuring chain switches are detected even when wallets (e.g. OKX) do not reliably emit standard events

The current implementation supports 8 EVM chains: Ethereum, Polygon, BNB Chain, Arbitrum, Optimism, Base, Avalanche, and Sepolia (testnet). Non-EVM chains are not supported — see §2 Libraries.

### Performance
`WalletButton` is dynamically imported via `next/dynamic` with `ssr: false`. The ~65KB (wagmi + viem + react-query) bundle is loaded as a separate chunk, not included in the critical-path first-load JavaScript (103KB shared). During SSR, a lightweight skeleton placeholder is rendered instead.

### Persistence
Wagmi v2's `createConfig` uses `createStorage` (localStorage by default) to persist the last connected connector. On page load, `autoConnect` replays the stored connector, restoring the previous session without manual localStorage code.

### Connector Configuration
- `multiInjectedProviderDiscovery: false` — auto-discovery is disabled to avoid event conflicts when multiple browser wallets are installed. A single explicit `injected({ shimDisconnect: true })` connector handles all browser wallet connections.
- `shimDisconnect: true` — writes a localStorage flag on disconnect, preventing wallets (particularly OKX) from silently auto-reconnecting when the page is revisited.
- `WalletConnect` connector is only included when `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` is set; otherwise the WalletConnect option is disabled in the UI.

## 2. Libraries Used

| Library | Version | Purpose |
|---------|---------|---------|
| `wagmi` | ^2.19.5 | React hooks for wallet operations (connect, disconnect, account, network, balance, ENS, signing) |
| `viem` | ^2.x | TypeScript Ethereum interaction library (types, transports, chain definitions) |
| `@tanstack/react-query` | ^5.52.0 | Async state management used internally by wagmi v2 |

These were chosen over alternatives (ethers.js, web3-react) because:
- wagmi is the current industry standard for React wallet integration
- Built-in React hooks eliminate boilerplate
- Automatic persistence and reconnection
- First-class TypeScript support
- Active maintenance and community

### EVM-Only Scope
The integration uses **wagmi + viem**, which are **EVM-only** libraries. They support Ethereum and all EVM-compatible chains (listed below) but do **not** support non-EVM chains such as Solana, Bitcoin, Tron, Cosmos, or Aptos.

**Supported chains (8):**
| Chain | Chain ID | Native Currency |
|-------|----------|----------------|
| Ethereum | 1 | ETH |
| Polygon | 137 | MATIC |
| BNB Chain | 56 | BNB |
| Arbitrum | 42161 | ETH |
| Optimism | 10 | ETH |
| Base | 8453 | ETH |
| Avalanche | 43114 | AVAX |
| Sepolia (testnet) | 11155111 | SepoliaETH |

Non-EVM support would require additional ecosystem-specific SDKs (`@solana/web3.js` for Solana, etc.)

## 3. Challenges Encountered

### SSR Compatibility
Next.js 15 App Router renders Server Components by default. Wagmi hooks (`useAccount`, `useConnect`, etc.) are client-side only. Placing `WagmiProvider` directly in `layout.tsx` would require marking the entire layout as `"use client"`, which breaks Server Component optimizations. The solution was a dedicated `WalletProvider.tsx` client component that wraps only the provider logic, keeping the layout as a Server Component.

### Connector Type Variance
Wagmi v2's `injected()` and `walletConnect()` connectors have slightly different `StorageItemMap` generic parameters. When placed in the same array, TypeScript strict mode reports a type incompatibility in the `removeItem` method signature. This is a known variance issue in wagmi's connector types. Fixed by using an inline spread expression in the config object rather than dynamically pushing to an array, which allows TypeScript to infer a union type correctly.

### WalletConnect Project ID
WalletConnect v2 requires a project ID from cloud.reown.com. Without one, the `walletConnect()` connector fails silently. The implementation guards against this: the WalletConnect option is only added to the connector list if `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` is set, and the UI shows a "Not configured" disabled state when missing.

### Modal Cut Off by backdrop-blur
The Header uses `backdrop-blur-md` (Tailwind's `backdrop-filter: blur()`). In CSS, any ancestor with `backdrop-filter`, `transform`, or `will-change` becomes the containing block for `fixed` positioned elements. This caused the wallet modal (`fixed inset-0`) to be clipped to the Header's bounds rather than covering the full viewport. Fixed by rendering the modal via `ReactDOM.createPortal()` directly into `document.body`, completely bypassing the parent stacking context.

### OKX Wallet Disconnect Shim
The `injected({ shimDisconnect: true })` option writes a localStorage flag when the user disconnects. However, when `multiInjectedProviderDiscovery: true` (wagmi's default), auto-discovered wallet connectors (OKX Wallet, MetaMask, etc.) do NOT inherit this shim. Connecting via an auto-discovered connector means `shimDisconnect` is never applied, causing OKX to silently reconnect on page revisit. Fixed by disabling `multiInjectedProviderDiscovery` and routing all browser-wallet connections through a single explicit `injected({ shimDisconnect: true })` connector.

### OKX Wallet Chain Change Detection
Some wallet implementations (notably OKX) do not reliably emit EIP-1193 `chainChanged` events through `window.ethereum`. Wagmi's `useChainId()` hook depends on these events, so chain switches went undetected. Fixed by adding a 2-second polling fallback that calls `window.ethereum.request({ method: 'eth_chainId' })` directly, ensuring chain ID is always accurate regardless of the wallet's event emission behavior.

### Unused Optional Peer Dependency Warnings
The MetaMask SDK pulls in optional dependencies (`@react-native-async-storage/async-storage`) that are not needed in a browser environment. These produce webpack module-not-found warnings. Fixed by adding `ignoreWarnings` patterns in `next.config.js` rather than installing unnecessary polyfills.

### React 19 Compatibility
`@tanstack/react-query` versions prior to 5.52.0 only declare `react: '^18.0.0'` in peer dependencies. The project uses React 19.1.0, so the dependency must be pinned to `^5.52.0` or later. Installing an earlier version produces npm peer-dependency warnings.

### hydration Warning with useSyncExternalStore
Wagmi v2 uses `useSyncExternalStore` internally. When combined with React StrictMode in development, the store subscription during the react-query `Hydrate` component's render phase triggers a "Cannot update a component while rendering a different component" warning. Fixed by adding `ssr: true` to `createConfig`, which instructs wagmi to use SSR-safe storage strategies and prevents the hydration state mismatch.

## 4. Future Improvements

Given more time, these enhancements would further strengthen the implementation:

### Server-Side Authentication (SIWE)
The current signing flow is client-side only. For a production authentication system, the signed message should be verified server-side using EIP-4361 (Sign-In with Ethereum). This would require:
- A `POST /api/auth/wallet` endpoint that recovers the signer address from the signature
- A server-generated nonce to prevent replay attacks
- A JWT-bound session tied to the wallet address

### Transaction History
Displaying past transactions for the connected wallet would require integration with a block explorer API (Etherscan, Blockscout) or an indexer service. The existing `ETHERSCAN_API_KEY` in `.env` provides the foundation for this.

### Wallet Connect Fallback for Mobile
On mobile devices, WalletConnect should trigger a deeplink to the installed wallet app (MetaMask, Rainbow, Trust Wallet) instead of showing a QR code. Wagmi's `walletConnect` connector handles this through platform detection, but the UX can be improved by detecting mobile user agents and pre-selecting the WalletConnect option.

### RPC Redundancy
The current implementation uses a two-tier RPC fallback (Alchemy → public endpoint). For global production use, adding regional RPC endpoints (e.g., QuickNode Tokyo for Asian users) would reduce latency. Wagmi's `fallback` transport can chain multiple providers ordered by geographic proximity.

### Unit Tests
The `useJPSoccerSignMessage` hook and `web3.ts` utility functions (`shortenAddress`, `isChainSupported`) are well-isolated candidates for unit testing with Vitest. Playwright (already a project dependency) could be used for E2E wallet connection tests with a test MetaMask extension.

### Error Monitoring
The `.env` file already contains `SENTRY_DSN`. Integrating Sentry error tracking for wallet connection failures and RPC errors would provide visibility into production issues without adding noise (user rejections should not be tracked as errors).

### Non-EVM Wallet Support
Supporting non-EVM chains (Solana, Bitcoin, Tron, etc.) would require adding per-ecosystem SDKs and maintaining separate connection state. This is not covered by wagmi and would be a significant architectural addition.
