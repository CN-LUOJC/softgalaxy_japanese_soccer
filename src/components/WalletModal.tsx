"use client";

import { useEffect, useCallback, useState, useRef } from "react";
import { createPortal } from "react-dom";
import { useConnect, useAccount } from "wagmi";
import { X, Wallet, Smartphone, ArrowLeft, ExternalLink } from "lucide-react";

interface WalletModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type ModalState = "select-type" | "connecting" | "error";

export default function WalletModal({ isOpen, onClose }: WalletModalProps) {
  const { connectAsync, connectors } = useConnect();
  const { isConnected } = useAccount();
  const [modalState, setModalState] = useState<ModalState>("select-type");
  const [errorMsg, setErrorMsg] = useState("");
  const [selectedName, setSelectedName] = useState("");
  const backdropRef = useRef<HTMLDivElement>(null);

  // Injected (browser) connector — single explicit instance with
  // shimDisconnect (multiInjectedProviderDiscovery is disabled).
  const walletConnectConnector = connectors.find(
    (c) => c.type === "walletConnect"
  );
  const wcDisabled =
    walletConnectConnector &&
    !process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID;

  // Close on successful connection
  useEffect(() => {
    if (isConnected && modalState === "connecting") {
      const timer = setTimeout(onClose, 500);
      return () => clearTimeout(timer);
    }
  }, [isConnected, modalState, onClose]);

  // Escape key to close
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  // Body scroll lock
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  // Focus management
  const firstCardRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (isOpen && modalState === "select-type") {
      firstCardRef.current?.focus();
    }
  }, [isOpen, modalState]);

  // Browser-wallet connectors (just the one explicit injected() with
  // shimDisconnect).  With multiInjectedProviderDiscovery disabled there
  // is exactly one injected connector for all browser wallets.
  const injectedConnectorsRaw = connectors.filter(
    (c) => c.type === "injected"
  );

  const handleConnect = useCallback(
    async (selected: (typeof connectors)[number]) => {
      if (
        selected.type === "walletConnect" &&
        !process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID
      ) {
        return;
      }

      // With multiInjectedProviderDiscovery disabled we always use the
      // single injected() connector so shimDisconnect and chain-change
      // events work reliably for every browser wallet.
      const connector = selected.type === "injected"
        ? injectedConnectorsRaw[0]
        : selected;

      setModalState("connecting");
      setSelectedName(selected.name);
      setErrorMsg("");

      // Mark this as a manual connection so WalletButton's auto-sign
      // effect knows to trigger (it skips auto-sign on page-refresh
      // reconnects).
      sessionStorage.setItem("wallet_manual_connect", Date.now().toString());

      try {
        await connectAsync({ connector });
      } catch (err: any) {
        const code = err?.code ?? err?.cause?.code;
        const msg = err?.message ?? "";

        if (code === 4001 || msg.toLowerCase().includes("rejected")) {
          setErrorMsg("Connection was rejected");
        } else if (msg.toLowerCase().includes("timeout")) {
          setErrorMsg("Connection timed out. Please try again.");
        } else {
          setErrorMsg("Connection failed. Please try again.");
        }
        setModalState("error");
      }
    },
    [connectAsync]
  );

  const handleBrowserWalletClick = () => {
    if (typeof window !== "undefined" && !(window as any).ethereum) {
      setErrorMsg(
        "No browser wallet detected. Install MetaMask, OKX Wallet, or another EIP-1193 compatible wallet."
      );
      setModalState("error");
      return;
    }

    const bwConnector = connectors.find((c) => c.type === "injected");
    if (bwConnector) handleConnect(bwConnector);
  };

  const handleBack = () => {
    if (modalState === "connecting" || modalState === "error") {
      setModalState("select-type");
    }
    setErrorMsg("");
    setSelectedName("");
  };

  const getTitle = () => {
    switch (modalState) {
      case "select-type":
        return "Connect Wallet";
      case "connecting":
        return `Connecting to ${selectedName}`;
      case "error":
        return "Connection Failed";
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div
      ref={backdropRef}
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 backdrop-blur-sm py-8"
      onClick={(e) => {
        if (e.target === backdropRef.current) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="wallet-modal-title"
    >
      <div className="m-auto w-full max-w-md rounded-3xl border border-gray-700 bg-gradient-to-br from-gray-800 to-gray-900 px-6 py-6 shadow-2xl sm:p-8">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {modalState !== "select-type" && (
              <button
                onClick={handleBack}
                className="p-1 text-gray-400 hover:text-yellow-200 transition-colors"
                aria-label="Back"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
            )}
            <h2
              id="wallet-modal-title"
              className="text-xl font-bold text-yellow-200"
            >
              {getTitle()}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-yellow-200 rounded-lg transition-colors"
            aria-label="Close modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* ── Step 1: Browser Wallet / WalletConnect ── */}
        {modalState === "select-type" && (
          <div className="space-y-4">
            {/* Browser Wallet */}
            <button
              ref={firstCardRef}
              onClick={handleBrowserWalletClick}
              className="flex w-full items-center gap-5 rounded-2xl border-2 border-gray-700 bg-gray-800 p-6 text-left transition-all duration-300 hover:border-yellow-500/50 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-yellow-500/50"
            >
              <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-yellow-200 to-yellow-100 shadow-lg">
                <Wallet className="h-7 w-7 text-black" />
              </div>
              <div className="flex-1">
                <p className="text-base font-bold text-white">
                  Browser Wallet
                </p>
                <p className="mt-0.5 text-sm text-gray-400">
                  MetaMask &middot; OKX &middot; Brave &middot; more
                </p>
              </div>
            </button>

            {/* WalletConnect */}
            <button
              ref={walletConnectConnector && !wcDisabled ? undefined : undefined}
              disabled={!!wcDisabled}
              onClick={() => {
                if (walletConnectConnector && !wcDisabled)
                  handleConnect(walletConnectConnector);
              }}
              className="flex w-full items-center gap-5 rounded-2xl border-2 border-gray-700 bg-gray-800 p-6 text-left transition-all duration-300 hover:border-yellow-500/50 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-yellow-500/50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-yellow-200 to-yellow-100 shadow-lg">
                <Smartphone className="h-7 w-7 text-black" />
              </div>
              <div className="flex-1">
                <p className="text-base font-bold text-white">
                  WalletConnect
                </p>
                <p className="mt-0.5 text-sm text-gray-400">
                  QR Code / Mobile
                </p>
              </div>
              {wcDisabled && (
                <span className="rounded-full bg-gray-700 px-2 py-0.5 text-xs text-gray-400">
                  Not configured
                </span>
              )}
            </button>
          </div>
        )}

        {/* ── Connecting ── */}
        {modalState === "connecting" && (
          <div className="flex flex-col items-center py-8">
            <div className="mb-6 h-14 w-14 animate-spin rounded-full border-4 border-yellow-500/30 border-t-yellow-200" />
            <p className="text-sm text-gray-300">
              Please approve the connection request in {selectedName}...
            </p>
            <button
              onClick={handleBack}
              className="mt-6 text-sm text-yellow-200 hover:text-yellow-100 transition-colors"
            >
              Cancel
            </button>
          </div>
        )}

        {/* ── Error ── */}
        {modalState === "error" && (
          <div className="flex flex-col items-center py-6">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-500/20">
              <X className="h-7 w-7 text-red-400" />
            </div>
            <p className="mb-1 text-center text-sm font-medium text-red-400">
              {errorMsg}
            </p>
            {errorMsg.includes("No browser wallet detected") ? (
              <a
                href="https://metamask.io/download/"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 inline-flex items-center gap-2 rounded-xl bg-yellow-200 px-5 py-2.5 text-sm font-semibold text-black transition-all duration-300 hover:bg-yellow-100"
              >
                Get a Wallet
                <ExternalLink className="h-4 w-4" />
              </a>
            ) : (
              <div className="mt-4 flex gap-3">
                <button
                  onClick={handleBack}
                  className="rounded-xl border border-gray-600 px-5 py-2.5 text-sm font-medium text-gray-300 transition-all duration-300 hover:bg-gray-700"
                >
                  Back
                </button>
                <button
                  onClick={() => {
                    // Find the failed connector by name and retry
                    const all = [
                      ...connectors,
                    ];
                    const connector = all.find(
                      (c) => c.name === selectedName
                    );
                    if (connector) handleConnect(connector);
                  }}
                  className="rounded-xl bg-yellow-200 px-5 py-2.5 text-sm font-semibold text-black transition-all duration-300 hover:bg-yellow-100"
                >
                  Try Again
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
