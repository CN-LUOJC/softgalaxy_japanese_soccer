"use client";

import { useSignMessage } from "wagmi";
import type { Hash } from "viem";

const SIGN_MESSAGE = "Sign in to JP Soccer";

interface UseJPSoccerSignMessageReturn {
  /** Hex-encoded signature after successful signing. */
  signature: Hash | undefined;
  /** True while the wallet signing popup is open. */
  isSigning: boolean;
  /** User-friendly error string, or null. */
  error: string | null;
  /** Trigger the signing flow. */
  signMessage: () => void;
  /** Clear signature & error. */
  reset: () => void;
}

/**
 * Branded "Sign in to JP Soccer" signing hook.
 *
 * Wraps wagmi's useSignMessage to provide a simplified interface with
 * friendly error handling for user rejections.
 */
export function useJPSoccerSignMessage(): UseJPSoccerSignMessageReturn {
  const {
    data: signature,
    isPending,
    error: wagmiError,
    signMessageAsync,
    reset: wagmiReset,
  } = useSignMessage();

  const handleSign = () => {
    signMessageAsync({
      message: SIGN_MESSAGE,
    }).catch(() => {
      /* caught by wagmiError */
    });
  };

  const reset = () => {
    wagmiReset();
  };

  // Map wagmi errors to user-friendly messages
  let friendlyError: string | null = null;
  if (wagmiError) {
    if (
      (wagmiError as any)?.name === "UserRejectedRequestError" ||
      (wagmiError as any)?.code === 4001 ||
      wagmiError.message?.toLowerCase().includes("rejected")
    ) {
      friendlyError = "Signature was rejected";
    } else {
      friendlyError = "Signing failed. Please try again.";
    }
  }

  return {
    signature,
    isSigning: isPending,
    error: friendlyError,
    signMessage: handleSign,
    reset,
  };
}
