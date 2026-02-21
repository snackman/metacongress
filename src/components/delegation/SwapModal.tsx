"use client";

import { useState, useEffect, useCallback } from "react";
import { useSwap } from "@/hooks/useSwap";
import { useAccount, useBalance } from "wagmi";
import { getChainId } from "@/lib/constants";
import { formatUnits } from "viem";

interface SwapModalProps {
  tokenAddress: `0x${string}`;
  tokenSymbol: string;
  chain: string;
  onClose: () => void;
}

const CHAIN_NATIVE: Record<string, { symbol: string; decimals: number }> = {
  ethereum: { symbol: "ETH", decimals: 18 },
  polygon: { symbol: "POL", decimals: 18 },
  arbitrum: { symbol: "ETH", decimals: 18 },
  optimism: { symbol: "ETH", decimals: 18 },
};

const STEP_LABELS: Record<string, string> = {
  quoting: "Getting quote...",
  approving: "Checking approval...",
  "signing-permit": "Sign permit in wallet...",
  swapping: "Preparing swap...",
  sending: "Confirm in wallet...",
  done: "Swap complete!",
};

export function SwapModal({
  tokenAddress,
  tokenSymbol,
  chain,
  onClose,
}: SwapModalProps) {
  const [amount, setAmount] = useState("");
  const { address } = useAccount();
  const chainId = getChainId(chain);
  const native = CHAIN_NATIVE[chain] ?? { symbol: "ETH", decimals: 18 };

  const { data: nativeBalance } = useBalance({
    address,
    chainId,
  });

  const {
    step,
    error,
    quoteData,
    txHash,
    getQuote,
    executeSwap,
    reset,
    parseAmount,
  } = useSwap(tokenAddress, chain);

  const isLoading = !["idle", "done", "error"].includes(step);

  // Debounced quote fetch
  useEffect(() => {
    if (!amount || parseFloat(amount) <= 0) return;
    const timer = setTimeout(() => {
      getQuote(parseAmount(amount, native.decimals)).catch(() => {});
    }, 500);
    return () => clearTimeout(timer);
  }, [amount, getQuote, parseAmount, native.decimals]);

  const handleSwap = useCallback(async () => {
    if (!amount || parseFloat(amount) <= 0) return;
    try {
      await executeSwap(parseAmount(amount, native.decimals));
    } catch {
      // error state handled by hook
    }
  }, [amount, executeSwap, parseAmount, native.decimals]);

  const formattedOutput = quoteData
    ? Number(
        formatUnits(BigInt(quoteData.outputAmount), 18)
      ).toLocaleString(undefined, { maximumFractionDigits: 4 })
    : null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-md mx-4 p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-white">
            Buy {tokenSymbol}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-xl leading-none"
          >
            &times;
          </button>
        </div>

        {/* Input */}
        <div className="bg-gray-800 rounded-xl p-4 mb-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-400">You pay</span>
            {nativeBalance && (
              <button
                className="text-xs text-gray-500 hover:text-gray-300"
                onClick={() =>
                  setAmount(
                    formatUnits(nativeBalance.value, nativeBalance.decimals)
                  )
                }
              >
                Max:{" "}
                {Number(
                  formatUnits(nativeBalance.value, nativeBalance.decimals)
                ).toFixed(4)}
              </button>
            )}
          </div>
          <div className="flex items-center gap-3">
            <input
              type="number"
              value={amount}
              onChange={(e) => {
                setAmount(e.target.value);
                reset();
              }}
              placeholder="0.0"
              className="bg-transparent text-2xl text-white w-full outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              disabled={isLoading}
            />
            <span className="text-gray-300 font-semibold whitespace-nowrap">
              {native.symbol}
            </span>
          </div>
        </div>

        {/* Output */}
        <div className="bg-gray-800 rounded-xl p-4 mb-4">
          <span className="text-sm text-gray-400 block mb-2">You receive</span>
          <div className="flex items-center gap-3">
            <span className="text-2xl text-white">
              {step === "quoting" && !quoteData
                ? "..."
                : formattedOutput ?? "0.0"}
            </span>
            <span className="text-gray-300 font-semibold whitespace-nowrap">
              {tokenSymbol}
            </span>
          </div>
          {quoteData && (
            <div className="mt-2 flex gap-4 text-xs text-gray-500">
              {quoteData.gasFeeUSD !== "0" && (
                <span>Gas: ~${Number(quoteData.gasFeeUSD).toFixed(2)}</span>
              )}
              {quoteData.priceImpact > 0 && (
                <span>Impact: {quoteData.priceImpact.toFixed(2)}%</span>
              )}
            </div>
          )}
        </div>

        {/* Status */}
        {isLoading && (
          <div className="mb-4 text-sm text-indigo-300 text-center">
            {STEP_LABELS[step] ?? step}
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-900/30 border border-red-800 text-sm text-red-300">
            {error}
          </div>
        )}

        {/* Success */}
        {step === "done" && txHash && (
          <div className="mb-4 p-3 rounded-lg bg-green-900/30 border border-green-800 text-sm text-green-300">
            Swap confirmed!{" "}
            <a
              href={`https://${chain === "ethereum" ? "" : chain + "."}etherscan.io/tx/${txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
            >
              View tx
            </a>
          </div>
        )}

        {/* Action button */}
        {step === "done" ? (
          <button
            onClick={onClose}
            className="w-full py-3 rounded-xl font-semibold bg-green-600 hover:bg-green-500 text-white transition-colors"
          >
            Done
          </button>
        ) : (
          <button
            onClick={handleSwap}
            disabled={!amount || parseFloat(amount) <= 0 || isLoading}
            className="w-full py-3 rounded-xl font-semibold bg-pink-600 hover:bg-pink-500 disabled:bg-gray-700 disabled:text-gray-500 text-white transition-colors"
          >
            {isLoading
              ? STEP_LABELS[step] ?? "Processing..."
              : `Swap for ${tokenSymbol}`}
          </button>
        )}

        <p className="mt-3 text-xs text-gray-600 text-center">
          Powered by Uniswap
        </p>
      </div>
    </div>
  );
}
