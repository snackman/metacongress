"use client";

import { useState, useCallback } from "react";
import { useAccount, useSendTransaction, useSignTypedData } from "wagmi";
import { parseUnits } from "viem";
import { getChainId } from "@/lib/constants";

const NATIVE_TOKEN = "0x0000000000000000000000000000000000000000";

type SwapStep = "idle" | "quoting" | "approving" | "signing-permit" | "swapping" | "sending" | "done" | "error";

interface QuoteResult {
  requestId: string;
  routing: string;
  quote: Record<string, unknown>;
  permitData?: {
    domain: Record<string, unknown>;
    types: Record<string, unknown[]>;
    values: Record<string, unknown>;
  };
}

interface SwapResult {
  swap: {
    to: string;
    from: string;
    data: string;
    value: string;
    maxFeePerGas?: string;
    maxPriorityFeePerGas?: string;
    gasLimit?: string;
    chainId: number;
  };
}

export function useSwap(
  tokenOut: `0x${string}`,
  chain: string
) {
  const { address } = useAccount();
  const { sendTransactionAsync } = useSendTransaction();
  const { signTypedDataAsync } = useSignTypedData();

  const [step, setStep] = useState<SwapStep>("idle");
  const [error, setError] = useState<string | null>(null);
  const [quoteData, setQuoteData] = useState<{
    outputAmount: string;
    gasFeeUSD: string;
    priceImpact: number;
  } | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);

  const chainId = getChainId(chain);

  async function apiCall(endpoint: string, body: Record<string, unknown>) {
    const res = await fetch("/api/swap", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ endpoint, ...body }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.detail || data.errorCode || data.error || "API error");
    }
    return data;
  }

  const getQuote = useCallback(
    async (amountIn: string) => {
      if (!address) throw new Error("Wallet not connected");
      setStep("quoting");
      setError(null);
      setQuoteData(null);

      try {
        const data: QuoteResult = await apiCall("quote", {
          type: "EXACT_INPUT",
          amount: amountIn,
          tokenInChainId: chainId,
          tokenOutChainId: chainId,
          tokenIn: NATIVE_TOKEN,
          tokenOut: tokenOut,
          swapper: address,
          slippageTolerance: 1,
          protocols: ["V2", "V3", "V4"],
        });

        const quote = data.quote as Record<string, unknown>;
        const output = quote.output as Record<string, unknown>;
        setQuoteData({
          outputAmount: output.amount as string,
          gasFeeUSD: (quote.gasFeeUSD as string) ?? "0",
          priceImpact: (quote.priceImpact as number) ?? 0,
        });
        setStep("idle");
        return data;
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Quote failed";
        setError(msg);
        setStep("error");
        throw e;
      }
    },
    [address, chainId, tokenOut]
  );

  const executeSwap = useCallback(
    async (amountIn: string) => {
      if (!address) throw new Error("Wallet not connected");
      setError(null);
      setTxHash(null);

      try {
        // 1. Check approval
        setStep("approving");
        const approval = await apiCall("check_approval", {
          walletAddress: address,
          token: NATIVE_TOKEN,
          amount: amountIn,
          chainId,
        });

        if (approval.approval) {
          await sendTransactionAsync({
            to: approval.approval.to as `0x${string}`,
            data: approval.approval.data as `0x${string}`,
            chainId,
          });
        }

        // 2. Get fresh quote
        setStep("quoting");
        const quoteRes: QuoteResult = await apiCall("quote", {
          type: "EXACT_INPUT",
          amount: amountIn,
          tokenInChainId: chainId,
          tokenOutChainId: chainId,
          tokenIn: NATIVE_TOKEN,
          tokenOut: tokenOut,
          swapper: address,
          slippageTolerance: 1,
          protocols: ["V2", "V3", "V4"],
        });

        // 3. Sign permit if needed
        let signature: string | undefined;
        let permitData: QuoteResult["permitData"] | undefined;

        if (quoteRes.permitData) {
          setStep("signing-permit");
          signature = await signTypedDataAsync({
            domain: quoteRes.permitData.domain as Record<string, unknown> & { chainId?: number },
            types: quoteRes.permitData.types as Record<string, Array<{ name: string; type: string }>>,
            primaryType: Object.keys(quoteRes.permitData.types).find(
              (k) => k !== "EIP712Domain"
            )!,
            message: quoteRes.permitData.values,
          });
          permitData = quoteRes.permitData;
        }

        // 4. Get swap calldata
        setStep("swapping");
        const swapBody: Record<string, unknown> = {
          quote: quoteRes.quote,
          simulateTransaction: true,
          refreshGasPrice: true,
        };
        if (signature && permitData) {
          swapBody.signature = signature;
          swapBody.permitData = permitData;
        }

        const swapRes: SwapResult = await apiCall("swap", swapBody);

        // 5. Send transaction
        setStep("sending");
        const hash = await sendTransactionAsync({
          to: swapRes.swap.to as `0x${string}`,
          data: swapRes.swap.data as `0x${string}`,
          value: BigInt(swapRes.swap.value),
          chainId: swapRes.swap.chainId,
          gas: swapRes.swap.gasLimit ? BigInt(swapRes.swap.gasLimit) : undefined,
        });

        setTxHash(hash);
        setStep("done");
        return hash;
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Swap failed";
        setError(msg);
        setStep("error");
        throw e;
      }
    },
    [address, chainId, tokenOut, sendTransactionAsync, signTypedDataAsync]
  );

  const reset = useCallback(() => {
    setStep("idle");
    setError(null);
    setQuoteData(null);
    setTxHash(null);
  }, []);

  return {
    step,
    error,
    quoteData,
    txHash,
    getQuote,
    executeSwap,
    reset,
    parseAmount: (amount: string, decimals = 18) =>
      parseUnits(amount, decimals).toString(),
  };
}
