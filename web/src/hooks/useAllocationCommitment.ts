"use client";

import { useState, useCallback } from "react";
import { useAccount, useSignMessage } from "wagmi";
import { useAllocationIdentity } from "./useAllocationIdentity";

function getSignMessage(allocationAddress: string, walletAddress: string): string {
  return `MetaSenate Vote Allocation\nAllocation: ${allocationAddress}\nWallet: ${walletAddress}`;
}

export function useAllocationCommitment(
  allocationAddress: `0x${string}` | undefined,
  nftContract: `0x${string}` | undefined
) {
  const { address } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const { identity, hasIdentity, createIdentity, isCreating } =
    useAllocationIdentity(allocationAddress);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submitCommitment = useCallback(
    async (tokenId: string) => {
      if (!allocationAddress || !address || !nftContract) return;

      setIsSubmitting(true);
      setError(null);

      try {
        const message = getSignMessage(allocationAddress, address);
        const signature = await signMessageAsync({ message });

        const { Identity } = await import("@semaphore-protocol/core");
        const id = new Identity(signature);
        const commitment = id.commitment.toString();

        const res = await fetch(
          `/api/allocation/${allocationAddress}/commitments`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              wallet: address,
              tokenId,
              commitment,
              signature,
              nftContract,
            }),
          }
        );

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Failed to submit commitment");
        }

        setIsSubmitted(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Submission failed");
      } finally {
        setIsSubmitting(false);
      }
    },
    [allocationAddress, address, nftContract, signMessageAsync]
  );

  return {
    identity,
    hasIdentity,
    createIdentity,
    isCreating,
    submitCommitment,
    isSubmitting,
    isSubmitted,
    error,
  };
}
