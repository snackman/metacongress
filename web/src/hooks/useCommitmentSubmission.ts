"use client";

import { useState, useCallback } from "react";
import { useAccount, useSignMessage } from "wagmi";
import { useIdentity } from "./useIdentity";

function getSignMessage(electionAddress: string, walletAddress: string): string {
  return `MetaSenate Election Identity\nElection: ${electionAddress}\nWallet: ${walletAddress}`;
}

export function useCommitmentSubmission(
  electionAddress: `0x${string}` | undefined,
  nftContract: `0x${string}` | undefined
) {
  const { address } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const { identity, hasIdentity, createIdentity, isCreating } =
    useIdentity(electionAddress);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submitCommitment = useCallback(
    async (tokenId: string) => {
      if (!electionAddress || !address || !nftContract) return;

      setIsSubmitting(true);
      setError(null);

      try {
        // Sign the message to create/derive the identity
        const message = getSignMessage(electionAddress, address);
        const signature = await signMessageAsync({ message });

        // Derive identity from signature (same as useIdentity)
        const { Identity } = await import("@semaphore-protocol/core");
        const id = new Identity(signature);
        const commitment = id.commitment.toString();

        // Submit to API
        const res = await fetch(
          `/api/election/${electionAddress}/commitments`,
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
    [electionAddress, address, nftContract, signMessageAsync]
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
