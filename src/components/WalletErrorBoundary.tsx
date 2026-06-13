"use client";

import { Component, type ReactNode } from "react";
import { Wallet, RefreshCw } from "lucide-react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

/**
 * Catches uncaught exceptions from wallet hooks / connectors so a single
 * rendering crash doesn't take down the entire header.
 */
export class WalletErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  handleRetry = () => {
    this.setState({ hasError: false });
  };

  render() {
    if (this.state.hasError) {
      return (
        <button
          onClick={this.handleRetry}
          className="flex items-center gap-2 rounded-lg border border-yellow-500/30 px-3 py-2 text-sm font-medium text-yellow-200 transition-all duration-300 hover:bg-yellow-500/10"
        >
          <Wallet className="h-4 w-4" />
          <span className="hidden sm:inline">Connect Wallet</span>
          <RefreshCw className="ml-1 h-3 w-3" />
        </button>
      );
    }

    return this.props.children;
  }
}
