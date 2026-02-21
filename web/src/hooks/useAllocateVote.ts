"use client";

import { useState, useCallback } from "react";
import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { useQuery } from "@tanstack/react-query";
import { Group, generateProof } from "@semaphore-protocol/core";
import type { Identity } from "@semaphore-protocol/core";
import { SENATE_ALLOCATION_ABI } from "@/lib/contracts";

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

export function useAllocateVote(
  allocationAddress: `0x${string}` | undefined
) {
  const [isGeneratingProof, setIsGeneratingProof] = useState(false);
  const {
    writeContract,
    data: hash,
    isPending: isSending,
    error,
    reset,
  } = useWriteContract();

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  const { data: commitmentsData } = useAllocationCommitments(allocationAddress);

  const scope = allocationAddress ? BigInt(allocationAddress) : undefined;

  const allocateVote = useCallback(
    async (identity: Identity, candidateIndex: number, comment: string) => {
      if (!allocationAddress || !commitmentsData?.commitments?.length || !scope)
        return;

      setIsGeneratingProof(true);
      try {
        const group = new Group(commitmentsData.commitments.map(BigInt));

        const proof = await generateProof(
          identity,
          group,
          candidateIndex,
          scope
        );

        writeContract({
          address: allocationAddress,
          abi: SENATE_ALLOCATION_ABI,
          functionName: "allocateVote",
          args: [
            {
              merkleTreeDepth: BigInt(proof.merkleTreeDepth),
              merkleTreeRoot: BigInt(proof.merkleTreeRoot),
              nullifier: BigInt(proof.nullifier),
              message: BigInt(proof.message),
              scope: BigInt(proof.scope),
              points: proof.points.map(BigInt) as unknown as readonly [
                bigint,
                bigint,
                bigint,
                bigint,
                bigint,
                bigint,
                bigint,
                bigint,
              ],
            },
            comment,
          ],
        });
      } finally {
        setIsGeneratingProof(false);
      }
    },
    [allocationAddress, commitmentsData, scope, writeContract]
  );

  return {
    allocateVote,
    isGeneratingProof,
    isSending,
    isConfirming,
    isSuccess,
    error,
    hash,
    reset,
  };
}
