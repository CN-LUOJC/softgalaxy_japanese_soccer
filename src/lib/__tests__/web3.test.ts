import { describe, it, expect } from "vitest";
import { shortenAddress, CHAIN_METADATA } from "@/lib/web3";

describe("shortenAddress", () => {
  it("shortens a standard Ethereum address", () => {
    const addr = "0x1234567890abcdef1234567890abcdef12345678";
    expect(shortenAddress(addr)).toBe("0x1234…5678");
  });

  it("uses custom chars count", () => {
    const addr = "0x1234567890abcdef1234567890abcdef12345678";
    expect(shortenAddress(addr, 6)).toBe("0x123456…345678");
  });

  it("returns the address as-is when it is too short", () => {
    const addr = "0x1234";
    expect(shortenAddress(addr)).toBe("0x1234");
  });

  it("handles empty string", () => {
    expect(shortenAddress("")).toBe("");
  });

  it("handles undefined-like input", () => {
    expect(shortenAddress("")).toBe("");
  });

  it("works with 10-character input (boundary)", () => {
    // 2 chars prefix + 4 + 4 = the minimum length for default shortening
    const addr = "0x12345678";
    expect(shortenAddress(addr)).toBe(addr);
  });
});

describe("CHAIN_METADATA", () => {
  it("contains Ethereum mainnet (1)", () => {
    expect(CHAIN_METADATA[1]).toBeDefined();
    expect(CHAIN_METADATA[1].name).toBe("Ethereum");
    expect(CHAIN_METADATA[1].currency).toBe("ETH");
    expect(CHAIN_METADATA[1].isTestnet).toBe(false);
  });

  it("contains known chains with proper shape", () => {
    for (const [id, meta] of Object.entries(CHAIN_METADATA)) {
      expect(meta.id).toBe(Number(id));
      expect(typeof meta.name).toBe("string");
      expect(typeof meta.currency).toBe("string");
      expect(typeof meta.explorerUrl).toBe("string");
      expect(typeof meta.isTestnet).toBe("boolean");
    }
  });

  it("includes at least the major mainnets", () => {
    const mainnetIds = [1, 137, 56, 42161, 10, 8453, 43114];
    for (const id of mainnetIds) {
      expect(CHAIN_METADATA[id]).toBeDefined();
    }
  });

  it("includes testnets", () => {
    const testnetIds = [11155111, 17000, 80002, 97, 421614, 11155420, 84532, 43113];
    for (const id of testnetIds) {
      expect(CHAIN_METADATA[id]).toBeDefined();
      expect(CHAIN_METADATA[id].isTestnet).toBe(true);
    }
  });

  it("chains not in metadata are simply absent (not an error)", () => {
    // Every EVM chain works; metadata is just for display enrichment
    expect(CHAIN_METADATA[99999]).toBeUndefined();
  });
});
