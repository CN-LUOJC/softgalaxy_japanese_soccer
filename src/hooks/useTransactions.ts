"use client";

import { useState, useEffect, useRef } from "react";
import { CHAIN_METADATA } from "@/lib/web3";

export interface Transaction {
  hash: string;
  from: string;
  to: string;
  value: string;
  timestamp: string;
  isSuccess: boolean;
  isSend: boolean;
}

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const TX_COUNT = 5;

interface CacheEntry {
  data: Transaction[];
  expiry: number;
}

const cache = new Map<string, CacheEntry>();

/**
 * Build the block-explorer API URL for a given chain.
 */
function explorerApiUrl(chainId: number): string | null {
  const meta = CHAIN_METADATA[chainId];
  if (!meta) return null;
  // Etherscan-compatible APIs share the same endpoint pattern
  return `${meta.explorerUrl}/api`;
}

/**
 * Normalise a hex or decimal value to a human-readable ETH/MATIC/BNB string.
 */
function formatTxValue(hexOrDec: string, decimals: number = 18): string {
  let val: string;
  if (hexOrDec.startsWith("0x")) {
    val = BigInt(hexOrDec).toString(10);
  } else {
    val = hexOrDec;
  }
  const padded = val.padStart(decimals + 1, "0");
  const intPart = padded.slice(0, padded.length - decimals) || "0";
  const fracPart = padded.slice(padded.length - decimals).replace(/0+$/, "");
  return fracPart ? `${intPart}.${fracPart}` : intPart;
}

/**
 * Fetch the last N normal transactions for the given address on the
 * given chain via the block-explorer API.  Results are cached for 5 min.
 */
export function useTransactions(
  address: `0x${string}` | undefined,
  chainId: number | undefined
): {
  transactions: Transaction[];
  isLoading: boolean;
  error: string | null;
} {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const activeRef = useRef(true);

  const cacheKey = `${chainId}:${address}`;

  useEffect(() => {
    activeRef.current = true;

    if (!address || !chainId) {
      setTransactions([]);
      setIsLoading(false);
      setError(null);
      return;
    }

    const cached = cache.get(cacheKey);
    if (cached && Date.now() < cached.expiry) {
      setTransactions(cached.data);
      return;
    }

    const baseUrl = explorerApiUrl(chainId);
    if (!baseUrl) {
      setTransactions([]);
      return;
    }

    const apiKey =
      process.env.NEXT_PUBLIC_ETHERSCAN_API_KEY || "";

    setIsLoading(true);
    setError(null);

    const url = `${baseUrl}?module=account&action=txlist&address=${address}&sort=desc&offset=${TX_COUNT}&page=1${apiKey ? `&apikey=${apiKey}` : ""}`;

    fetch(url)
      .then((res) => res.json())
      .then((json) => {
        if (!activeRef.current) return;

        if (json.status !== "1" || !json.result) {
          // "No transactions found" is a valid empty result
          if (json.message?.includes("No transactions")) {
            setTransactions([]);
            cache.set(cacheKey, { data: [], expiry: Date.now() + CACHE_TTL });
            return;
          }
          setError("Could not load transactions");
          return;
        }

        const txs: Transaction[] = json.result
          .slice(0, TX_COUNT)
          .map((tx: any) => ({
            hash: tx.hash,
            from: tx.from.toLowerCase(),
            to: (tx.to || "").toLowerCase(),
            value: formatTxValue(tx.value),
            timestamp: tx.timeStamp,
            isSuccess: tx.isError === "0",
            isSend: tx.from.toLowerCase() === address.toLowerCase(),
          }));

        setTransactions(txs);
        cache.set(cacheKey, { data: txs, expiry: Date.now() + CACHE_TTL });
      })
      .catch(() => {
        if (activeRef.current) setError("Failed to load transactions");
      })
      .finally(() => {
        if (activeRef.current) setIsLoading(false);
      });

    return () => {
      activeRef.current = false;
    };
  }, [address, chainId, cacheKey]);

  return { transactions, isLoading, error };
}
