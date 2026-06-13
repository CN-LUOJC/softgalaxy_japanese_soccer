import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useJPSoccerSignMessage } from "@/hooks/useSignMessage";

// Mock wagmi's useSignMessage
const mockSignMessageAsync = vi.fn();

vi.mock("wagmi", () => ({
  useSignMessage: vi.fn(() => ({
    data: undefined,
    isPending: false,
    error: null,
    signMessageAsync: mockSignMessageAsync,
    reset: vi.fn(),
  })),
}));

// Get a reference to the mock so we can mutate its return value
import { useSignMessage } from "wagmi";
const mockUseSignMessage = useSignMessage as unknown as ReturnType<typeof vi.fn>;

describe("useJPSoccerSignMessage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseSignMessage.mockReturnValue({
      data: undefined,
      isPending: false,
      error: null,
      signMessageAsync: mockSignMessageAsync,
      reset: vi.fn(),
    });
  });

  it("returns initial state", () => {
    const { result } = renderHook(() => useJPSoccerSignMessage());

    expect(result.current.signature).toBeUndefined();
    expect(result.current.isSigning).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("calls signMessageAsync with the correct message", async () => {
    mockSignMessageAsync.mockResolvedValueOnce("0xsig");

    const { result } = renderHook(() => useJPSoccerSignMessage());

    act(() => {
      result.current.signMessage();
    });

    await waitFor(() => {
      expect(mockSignMessageAsync).toHaveBeenCalledWith({
        message: "Sign in to JP Soccer",
      });
    });
  });

  it("handles call without crashing when async settles", async () => {
    mockSignMessageAsync.mockResolvedValueOnce("0xsig");

    const { result } = renderHook(() => useJPSoccerSignMessage());

    act(() => {
      result.current.signMessage();
    });

    // Just verify it doesn't throw
    await waitFor(() => {
      expect(mockSignMessageAsync).toHaveBeenCalled();
    });
  });

  it("maps rejection error to friendly message", async () => {
    const rejectErr = new Error("User rejected request");
    (rejectErr as any).name = "UserRejectedRequestError";
    mockSignMessageAsync.mockRejectedValueOnce(rejectErr);

    // Render hook with error state
    mockUseSignMessage.mockReturnValue({
      data: undefined,
      isPending: false,
      error: rejectErr,
      signMessageAsync: mockSignMessageAsync,
      reset: vi.fn(),
    });

    const { result } = renderHook(() => useJPSoccerSignMessage());

    expect(result.current.error).toBe("Signature was rejected");
  });

  it("maps unknown error to generic message", async () => {
    const genericErr = new Error("Something went wrong");
    mockSignMessageAsync.mockRejectedValueOnce(genericErr);

    mockUseSignMessage.mockReturnValue({
      data: undefined,
      isPending: false,
      error: genericErr,
      signMessageAsync: mockSignMessageAsync,
      reset: vi.fn(),
    });

    const { result } = renderHook(() => useJPSoccerSignMessage());

    expect(result.current.error).toBe("Signing failed. Please try again.");
  });

  it("calls wagmi reset when reset is invoked", () => {
    const mockReset = vi.fn();
    mockUseSignMessage.mockReturnValue({
      data: undefined,
      isPending: false,
      error: null,
      signMessageAsync: mockSignMessageAsync,
      reset: mockReset,
    });

    const { result } = renderHook(() => useJPSoccerSignMessage());

    act(() => {
      result.current.reset();
    });

    expect(mockReset).toHaveBeenCalled();
  });
});
