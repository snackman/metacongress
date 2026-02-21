"use client";

import { useState, useCallback } from "react";
import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { useQuery } from "@tanstack/react-query";
import { Group, generateProof } from "@semaphore-protocol/core";
import type { Identity } from "@semaphore-protocol/core";
import { SENATE_ELECTION_V3_ABI } from "@/lib/contracts";

function useCommitments(electionAddress: `0x${string}` | undefined) {
  return useQuery({
    queryKey: ["commitments", electionAddress],
    queryFn: async () => {
      const res = await fetch(
        `/api/election/${electionAddress}/commitments`
      );
      if (!res.ok) throw new Error("Failed to fetch commitments");
      return res.json() as Promise<{
        commitments: string[];
        root: string;
        count: number;
      }>;
    },
    enabled: !!electionAddress,
    staleTime: 30_000,
  });
}

export function useAnonymousVoteV3(
  electionAddress: `0x${string}` | undefined
) {
  const [isGeneratingProof, setIsGeneratingProof] = useState(false);
  const {
    writeContract,
    data: hash,
    isPending: isSending,
    error,
  } = useWriteContract();

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  const { data: commitmentsData } = useCommitments(electionAddress);

  const scope = electionAddress ? BigInt(electionAddress) : undefined;

  const castVote = useCallback(
    async (identity: Identity, candidateIndex: number, comment: string) => {
      if (!electionAddress || !commitmentsData?.commitments?.length || !scope)
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
          address: electionAddress,
          abi: SENATE_ELECTION_V3_ABI,
          functionName: "castAnonymousVote",
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
    [electionAddress, commitmentsData, scope, writeContract]
  );

  return {
    castVote,
    isGeneratingProof,
    isSending,
    isConfirming,
    isSuccess,
    error,
    hash,
  };
}
