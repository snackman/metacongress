"use client";

import { useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { Group, generateProof } from "@semaphore-protocol/core";
import type { Identity } from "@semaphore-protocol/core";

function useAllocationCommitments(
  allocationAddress: `0x${string}` | undefined
) {
  return useQuery({
    queryKey: ["allocation-commitments", allocationAddress],
    queryFn: async () => {
      const res = await fetch(
        `/api/allocation/${allocationAddress}/commitments`
      );
      if (!res.ok) throw new Error("Failed to fetch commitments");
      return res.json() as Promise<{
        commitments: string[];
        root: string;
        count: number;
      }>;
    },
    enabled: !!allocationAddress,
    staleTime: 30_000,
  });
}

// Sentinel value used as proof.message for withdraw operations.
// The contract ignores proof.message for withdrawVote, but the ZK proof
// generation requires a message value. Using type(uint256).max as sentinel.
const WITHDRAW_SENTINEL = BigInt(
  "115792089237316195423570985008687907853269984665640564039457584007913129639935"
);

export function useAllocateVote(
  allocationAddress: `0x${string}` | undefined
) {
  const [isGeneratingProof, setIsGeneratingProof] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [hash, setHash] = useState<`0x${string}` | undefined>(undefined);

  const { data: commitmentsData } = useAllocationCommitments(allocationAddress);

  const scope = allocationAddress ? BigInt(allocationAddress) : undefined;

  const reset = useCallback(() => {
    setIsGeneratingProof(false);
    setIsSending(false);
    setIsConfirming(false);
    setIsSuccess(false);
    setError(null);
    setHash(undefined);
  }, []);

  const submitToRelay = useCallback(
    async (
      proof: {
        merkleTreeDepth: number;
        merkleTreeRoot: bigint | string;
        nullifier: bigint | string;
        message: bigint | string;
        scope: bigint | string;
        points: (bigint | string)[];
      },
      comment: string,
      functionName: "allocateVote" | "withdrawVote"
    ) => {
      if (!allocationAddress) return;

      setIsSending(true);
      setError(null);

      try {
        const res = await fetch(
          `/api/allocation/${allocationAddress}/relay`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              proof: {
                merkleTreeDepth: proof.merkleTreeDepth.toString(),
                merkleTreeRoot: proof.merkleTreeRoot.toString(),
                nullifier: proof.nullifier.toString(),
                message: proof.message.toString(),
                scope: proof.scope.toString(),
                points: proof.points.map((p) => p.toString()),
              },
              comment,
              functionName,
            }),
          }
        );

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || "Relay request failed");
        }

        setIsSending(false);
        setIsConfirming(true);
        setHash(data.hash as `0x${string}`);

        // The relay already waits for confirmation, so if we got a response
        // with a hash, the transaction is confirmed.
        if (data.status === "success") {
          setIsConfirming(false);
          setIsSuccess(true);
        } else {
          throw new Error("Transaction reverted on-chain");
        }
      } catch (err) {
        setIsSending(false);
        setIsConfirming(false);
        setError(
          err instanceof Error ? err : new Error("Unknown relay error")
        );
      }
    },
    [allocationAddress]
  );

  const allocateVote = useCallback(
    async (identity: Identity, candidateIndex: number, comment: string) => {
      if (!allocationAddress || !commitmentsData?.commitments?.length || !scope)
        return;

      setIsGeneratingProof(true);
      setIsSuccess(false);
      setError(null);
      setHash(undefined);
      try {
        const group = new Group(commitmentsData.commitments.map(BigInt));

        const proof = await generateProof(
          identity,
          group,
          candidateIndex,
          scope
        );

        setIsGeneratingProof(false);

        await submitToRelay(proof, comment, "allocateVote");
      } catch (err) {
        setIsGeneratingProof(false);
        if (!error) {
          setError(
            err instanceof Error ? err : new Error("Proof generation failed")
          );
        }
      }
    },
    [allocationAddress, commitmentsData, scope, submitToRelay, error]
  );

  const withdrawVote = useCallback(
    async (identity: Identity) => {
      if (!allocationAddress || !commitmentsData?.commitments?.length || !scope)
        return;

      setIsGeneratingProof(true);
      setIsSuccess(false);
      setError(null);
      setHash(undefined);
      try {
        const group = new Group(commitmentsData.commitments.map(BigInt));

        const proof = await generateProof(
          identity,
          group,
          WITHDRAW_SENTINEL,
          scope
        );

        setIsGeneratingProof(false);

        await submitToRelay(proof, "", "withdrawVote");
      } catch (err) {
        setIsGeneratingProof(false);
        if (!error) {
          setError(
            err instanceof Error ? err : new Error("Proof generation failed")
          );
        }
      }
    },
    [allocationAddress, commitmentsData, scope, submitToRelay, error]
  );

  return {
    allocateVote,
    withdrawVote,
    isGeneratingProof,
    isSending,
    isConfirming,
    isSuccess,
    error,
    hash,
    reset,
  };
}
