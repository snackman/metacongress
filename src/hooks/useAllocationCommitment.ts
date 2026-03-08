"use client";

import { useState, useCallback } from "react";
import { useAccount, useSignMessage } from "wagmi";
import { useAllocationIdentity } from "./useAllocationIdentity";

function getSignMessage(allocationAddress: string, walletAddress: string, tokenId: string): string {
  return `MetaSenate Vote Allocation\nAllocation: ${allocationAddress}\nWallet: ${walletAddress}\nTokenId: ${tokenId}`;
}

export function useAllocationCommitment(
  allocationAddress: `0x${string}` | undefined,
  nftContract: `0x${string}` | undefined
) {
  const { address } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const { identities, hasAnyIdentity, createIdentity, storeIdentity, isCreating } =
    useAllocationIdentity(allocationAddress);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedTokens, setSubmittedTokens] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  const submitCommitment = useCallback(
    async (tokenId: string) => {
      if (!allocationAddress || !address || !nftContract) return null;

      setIsSubmitting(true);
      setError(null);

      try {
        const message = getSignMessage(allocationAddress, address, tokenId);
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

        // Store the identity from the SAME signature used for the commitment.
        // Do NOT call createIdentity() here — it would re-sign and produce a
        // different identity that won't match the commitment in the DB.
        storeIdentity(tokenId, id);

        setSubmittedTokens((prev) => new Set(prev).add(tokenId));

        // Return the identity so callers can use it immediately without
        // waiting for React state to update.
        return id;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Submission failed");
        return null;
      } finally {
        setIsSubmitting(false);
      }
    },
    [allocationAddress, address, nftContract, signMessageAsync, storeIdentity]
  );

  return {
    identities,
    hasAnyIdentity,
    createIdentity,
    isCreating,
    submitCommitment,
    isSubmitting,
    isSubmittedForToken: (tokenId: string) => submittedTokens.has(tokenId),
    hasAnySubmitted: submittedTokens.size > 0,
    error,
  };
}
