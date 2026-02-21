"use client";

import { useState, useCallback } from "react";
import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { Group, generateProof } from "@semaphore-protocol/core";
import type { Identity } from "@semaphore-protocol/core";
import { SENATE_ELECTION_V2_ABI } from "@/lib/contracts";
import { useGroupMembers } from "./useGroupMembers";

export function useAnonymousVote(
  electionAddress: `0x${string}` | undefined,
  groupId: bigint | undefined
) {
  const [isGeneratingProof, setIsGeneratingProof] = useState(false);
  const { writeContract, data: hash, isPending: isSending, error } = useWriteContract();

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  const { data: members } = useGroupMembers(groupId);

  // Read scope from the election contract address
  const scope = electionAddress
    ? BigInt(electionAddress)
    : undefined;

  const castVote = useCallback(
    async (identity: Identity, candidateIndex: number, comment: string) => {
      if (!electionAddress || !members || !scope) return;

      setIsGeneratingProof(true);
      try {
        // Build the off-chain Semaphore group from on-chain commitments
        const group = new Group(members);

        // Generate ZK proof
        const proof = await generateProof(
          identity,
          group,
          candidateIndex,
          scope
        );

        // Submit to contract
        writeContract({
          address: electionAddress,
          abi: SENATE_ELECTION_V2_ABI,
          functionName: "castAnonymousVote",
          args: [
            {
              merkleTreeDepth: BigInt(proof.merkleTreeDepth),
              merkleTreeRoot: BigInt(proof.merkleTreeRoot),
              nullifier: BigInt(proof.nullifier),
              message: BigInt(proof.message),
              scope: BigInt(proof.scope),
              points: proof.points.map(BigInt) as unknown as readonly [
                bigint, bigint, bigint, bigint,
                bigint, bigint, bigint, bigint
              ],
            },
            comment,
          ],
        });
      } finally {
        setIsGeneratingProof(false);
      }
    },
    [electionAddress, members, scope, writeContract]
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
