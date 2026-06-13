"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  useAccount,
  useChainId,
  useBalance,
  useEnsName,
  useDisconnect,
  useSwitchChain,
} from "wagmi";
import { mainnet } from "wagmi/chains";
import {
  Wallet,
  ChevronDown,
  Copy,
  Check,
  LogOut,
  Globe,
  Circle,
  ExternalLink,
  User,
  X,
  Sun,
  Moon,
} from "lucide-react";
import {
  shortenAddress,
  CHAIN_METADATA,
  type ChainMeta,
} from "@/lib/web3";
import { useJPSoccerSignMessage } from "@/hooks/useSignMessage";
import { useTransactions } from "@/hooks/useTransactions";
import { useTheme } from "@/contexts/ThemeContext";
import WalletModal from "./WalletModal";

export default function WalletButton() {
  // ── wagmi hooks ──────────────────────────────────────────────────
  const { address, isConnected, isConnecting, isReconnecting, connector } = useAccount();
  const wagmiChainId = useChainId();
  const { data: balance } = useBalance({ address });
  const { data: ensName } = useEnsName({ address, chainId: mainnet.id });
  const { disconnect } = useDisconnect();
  const { switchChainAsync } = useSwitchChain();
  const [switchingTo, setSwitchingTo] = useState<number | null>(null);

  // Live chain ID — uses wagmi when available, with a polling fallback
  // for injected wallets (OKX) that may not emit chainChanged reliably.
  // WalletConnect handles chain events through the session natively.
  const [liveChainId, setLiveChainId] = useState(wagmiChainId);
  useEffect(() => {
    if (!isConnected) return;
    setLiveChainId(wagmiChainId);

    // Polling fallback only for injected (browser) wallets where some
    // implementations (OKX) don't reliably fire EIP-1193 chainChanged.
    if (connector?.type !== "injected") return;

    const provider = (window as any)?.ethereum;
    if (!provider?.request) return;

    let active = true;

    const poll = async () => {
      try {
        const hex = await provider.request({ method: "eth_chainId" });
        if (active) setLiveChainId(parseInt(hex, 16));
      } catch { /* poll error — ignore */ }
    };
    poll();
    const interval = setInterval(poll, 2000);

    const onChainChanged = (hex: string) => {
      if (active) setLiveChainId(parseInt(hex, 16));
    };
    if (provider.on) provider.on("chainChanged", onChainChanged);

    return () => {
      active = false;
      clearInterval(interval);
      if (provider.removeListener)
        provider.removeListener("chainChanged", onChainChanged);
    };
  }, [isConnected, wagmiChainId, connector]);

  const chainId = liveChainId;

  // ── local state ───────────────────────────────────────────────────
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [reconnectTimedOut, setReconnectTimedOut] = useState(false);

  // Clear WalletConnect v2 session data from localStorage so stale
  // sessions don't cause infinite reconnection loops.
  const clearWalletConnectStorage = useCallback(() => {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith("wc@") || key.startsWith("walletconnect"))) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((key) => localStorage.removeItem(key));
  }, []);

  // If auto-reconnect (especially WalletConnect) hangs for >8 s, time
  // it out and fall back to the disconnected state so the user can
  // manually reconnect or cancel.
  useEffect(() => {
    if (isConnecting || isReconnecting) {
      const timer = setTimeout(() => setReconnectTimedOut(true), 8000);
      return () => clearTimeout(timer);
    }
    setReconnectTimedOut(false);
  }, [isConnecting, isReconnecting]);

  const handleCancelReconnect = useCallback(() => {
    clearWalletConnectStorage();
    disconnect();
    setReconnectTimedOut(true);
  }, [clearWalletConnectStorage, disconnect]);

  // Close modal immediately once connected (prevents stale isModalOpen
  // from re-opening the modal in the connected branch).
  useEffect(() => {
    if (isConnected) setIsModalOpen(false);
  }, [isConnected]);

  // Signing hook
  const {
    signature,
    isSigning,
    error: signError,
    signMessage,
    reset: resetSign,
  } = useJPSoccerSignMessage();

  // ── theme ────────────────────────────────────────────────────────
  const { theme, toggleTheme } = useTheme();

  // ── transaction history ──────────────────────────────────────────
  const {
    transactions,
    isLoading: txsLoading,
  } = useTransactions(address, chainId);

  // Auto-trigger signing once after a fresh manual wallet connection
  // (not on page-refresh reconnects).  sessionStorage flag is set by
  // WalletModal when the user actively clicks a wallet to connect.
  const signRef = useRef(signMessage);
  signRef.current = signMessage;

  useEffect(() => {
    if (isConnected && !signature && !isSigning) {
      const manualFlag = sessionStorage.getItem("wallet_manual_connect");
      if (!manualFlag) return;               // page-refresh reconnect — skip
      sessionStorage.removeItem("wallet_manual_connect");
      const timer = setTimeout(() => signRef.current(), 600);
      return () => clearTimeout(timer);
    }
  }, [isConnected, signature, isSigning]);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // ── close dropdown on outside click / Escape ──────────────────────
  useEffect(() => {
    if (!isDropdownOpen) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsDropdownOpen(false);
    };
    const onClick = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClick);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onClick);
    };
  }, [isDropdownOpen]);

  // ── helpers ──────────────────────────────────────────────────────
  const chainMeta: ChainMeta | undefined = chainId
    ? CHAIN_METADATA[chainId]
    : undefined;

  const displayName =
    ensName || (address ? shortenAddress(address) : "");

  const handleCopy = useCallback(async () => {
    if (!address) return;
    try {
      await navigator.clipboard.writeText(address);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch {
      // Clipboard unavailable
    }
  }, [address]);

  // ── connecting / reconnecting state (with timeout & cancel) ──────
  if ((isConnecting || isReconnecting) && !reconnectTimedOut) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-yellow-500/20 px-3 py-2">
        <div className="h-2 w-2 animate-pulse rounded-full bg-yellow-400" />
        <span className="text-sm text-yellow-200">Connecting…</span>
        <button
          onClick={handleCancelReconnect}
          className="ml-1 rounded p-0.5 text-gray-400 hover:bg-gray-700 hover:text-yellow-200 transition-colors"
          aria-label="Cancel reconnection"
        >
          <X className="h-3 w-3" />
        </button>
      </div>
    );
  }

  // ── disconnected (also shown after reconnect timeout) ─────────────
  if (!isConnected || reconnectTimedOut) {
    const handleClick = () => {
      if (reconnectTimedOut) {
        clearWalletConnectStorage();
        setReconnectTimedOut(false);
      }
      setIsModalOpen(true);
    };

    return (
      <>
        <button
          onClick={handleClick}
          className="flex items-center gap-2 rounded-lg border border-yellow-500/30 bg-gradient-to-r from-yellow-500/10 to-yellow-600/10 px-3 py-2 text-sm font-semibold text-yellow-200 shadow-lg backdrop-blur-sm transition-all duration-300 hover:from-yellow-500/20 hover:to-yellow-600/20"
        >
          <Wallet className="h-4 w-4" />
          <span className="hidden sm:inline">Connect Wallet</span>
        </button>
        <WalletModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
        />
      </>
    );
  }

  // ── connected ─────────────────────────────────────────────────────
  return (
    <>
      {/* Trigger button */}
      <button
        ref={buttonRef}
        onClick={() => setIsDropdownOpen((v) => !v)}
        className="flex items-center gap-2 rounded-lg border border-yellow-500/20 bg-gray-900/80 px-3 py-2 text-sm font-medium text-yellow-200 shadow-lg backdrop-blur-sm transition-all duration-300 hover:bg-gray-800"
      >
        <span
          className={`h-2 w-2 rounded-full bg-green-400 shadow-sm`}
        />
        <span className="hidden sm:inline">{displayName}</span>
        <ChevronDown
          className={`h-4 w-4 transition-transform duration-200 ${
            isDropdownOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {/* Dropdown */}
      {isDropdownOpen && (
        <div
          ref={dropdownRef}
          className="wallet-dropdown absolute right-0 top-full z-50 mt-2 w-80 origin-top-right rounded-2xl border border-gray-700 bg-gradient-to-br from-gray-800 to-gray-900 p-5 shadow-2xl backdrop-blur-md transition-all duration-200"
        >
          <div className="space-y-4">
            {/* Wallet address + copy + theme toggle */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-gray-300 min-w-0">
                <button
                  onClick={handleCopy}
                  className="flex-shrink-0 rounded-lg p-1.5 text-gray-400 transition-all duration-300 hover:bg-gray-700 hover:text-yellow-200"
                  aria-label="Copy address"
                >
                  {isCopied ? (
                    <Check className="h-3.5 w-3.5 text-green-400" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                </button>
                <span className="font-mono text-xs truncate">
                  {address
                    ? `${address.slice(0, 6)}…${address.slice(-4)}`
                    : ""}
                </span>
              </div>
              <button
                onClick={toggleTheme}
                className="flex-shrink-0 rounded-lg p-1.5 text-gray-400 transition-all duration-300 hover:bg-gray-700 hover:text-yellow-200"
                aria-label="Toggle theme"
              >
                {theme === "dark" ? (
                  <Sun className="h-3.5 w-3.5" />
                ) : (
                  <Moon className="h-3.5 w-3.5" />
                )}
              </button>
            </div>

            {/* Full address (selectable) */}
            {address && (
              <div className="rounded-xl bg-gray-900/80 px-3 py-2 font-mono text-xs text-gray-400 break-all select-all">
                {address}
              </div>
            )}

            {/* ENS name */}
            {ensName && (
              <div className="flex items-center gap-2 text-sm text-gray-300">
                <Globe className="h-4 w-4 text-yellow-200" />
                <span>{ensName}</span>
              </div>
            )}

            {/* Balance */}
            {balance && (
              <div className="flex items-center gap-2 text-sm text-gray-300">
                <Wallet className="h-4 w-4 text-yellow-200" />
                <span>
                  {parseFloat(balance.formatted).toFixed(4)}{" "}
                  {balance.symbol}
                </span>
              </div>
            )}

            {/* Network */}
            <div>
              <div className="mb-2 flex items-center gap-2 text-sm">
                <Circle className="h-3 w-3 text-green-400" fill="currentColor" />
                <span className="text-gray-300">
                  {chainMeta?.name ?? `Chain ID: ${chainId}`}
                </span>
                {chainMeta?.explorerUrl && (
                  <a
                    href={`${chainMeta.explorerUrl}/address/${address}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-auto text-gray-400 hover:text-yellow-200 transition-colors"
                  >
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>

              {/* Quick chain-switch pills — helpful for WalletConnect
                  mobile users who cannot easily switch chains in their
                  wallet app. */}
              <div className="flex flex-wrap gap-1.5">
                {Object.values(CHAIN_METADATA).map((chain) => (
                    <button
                      key={chain.id}
                      disabled={switchingTo === chain.id || chainId === chain.id}
                      onClick={async () => {
                        setSwitchingTo(chain.id);
                        try {
                          await switchChainAsync?.({ chainId: chain.id });
                        } catch {
                          /* user rejected or switch failed */
                        } finally {
                          setSwitchingTo(null);
                        }
                      }}
                      className={`rounded-md px-2 py-0.5 text-[11px] font-medium transition-all duration-200 ${
                        chainId === chain.id
                          ? "bg-green-500/20 text-green-300"
                          : "bg-yellow-500/10 text-yellow-200 hover:bg-yellow-500/20"
                      } disabled:cursor-default disabled:opacity-100`}
                    >
                      {switchingTo === chain.id ? "…" : chain.name}
                    </button>
                  ))}
              </div>
            </div>

            {/* ── Recent transactions ── */}
            {chainMeta && transactions.length > 0 && (
              <div className="border-t border-gray-700 pt-3">
                <p className="mb-2 text-xs font-medium text-gray-400">
                  Recent transactions
                </p>
                <div className="space-y-1.5">
                  {transactions.map((tx) => (
                    <a
                      key={tx.hash}
                      href={`${chainMeta.explorerUrl}/tx/${tx.hash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between rounded-lg bg-gray-900/60 px-3 py-2 text-xs transition-colors hover:bg-gray-800"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-gray-400 font-mono">
                          {tx.hash.slice(0, 6)}…{tx.hash.slice(-4)}
                        </span>
                        <span className="text-gray-500">
                          {tx.isSend ? "→" : "←"}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-gray-300">
                          {tx.value} {chainMeta.currency}
                        </span>
                        <span
                          className={
                            tx.isSuccess ? "text-green-400" : "text-red-400"
                          }
                        >
                          {tx.isSuccess ? "✓" : "✗"}
                        </span>
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            )}
            {txsLoading && (
              <div className="border-t border-gray-700 pt-3">
                <p className="text-xs text-gray-500">Loading transactions…</p>
              </div>
            )}

            {/* ── Authentication (sign in with wallet) ── */}
            <div className="border-t border-gray-700 pt-4">
              {signature ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-400" />
                    <span className="text-sm font-medium text-green-400">
                      Authenticated
                    </span>
                  </div>
                  <div className="rounded-xl bg-gray-900/80 px-3 py-2 font-mono text-xs text-green-400 break-all select-all">
                    {signature}
                  </div>
                  <button
                    onClick={resetSign}
                    className="text-xs text-gray-400 hover:text-yellow-200 transition-colors"
                  >
                    Clear signature
                  </button>
                </div>
              ) : isSigning ? (
                <div className="flex items-center gap-3 py-2">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-yellow-400/30 border-t-yellow-400" />
                  <span className="text-sm text-yellow-200">
                    Signing authentication message...
                  </span>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-xs font-medium text-gray-400">
                    Sign in to complete authentication
                  </p>
                  <button
                    onClick={signMessage}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-yellow-200 to-yellow-100 px-4 py-2.5 text-sm font-semibold text-black transition-all duration-300 hover:from-yellow-200 hover:to-yellow-100"
                  >
                    Sign in to JP Soccer
                  </button>
                  {signError && (
                    <p className="text-xs text-red-400">{signError}</p>
                  )}
                </div>
              )}
            </div>

            {/* ── Disconnect ── */}
            <div className="border-t border-gray-700 pt-3">
              <button
                onClick={() => {
                  clearWalletConnectStorage();
                  disconnect();
                  setIsDropdownOpen(false);
                  resetSign();
                }}
                className="flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-medium text-red-400 transition-all duration-300 hover:bg-red-500/10"
              >
                <LogOut className="h-4 w-4" />
                Disconnect
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Wallet modal (for reconnecting) */}
      <WalletModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  );
}
