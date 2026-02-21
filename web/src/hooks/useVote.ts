"use client";

import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { SENATE_ELECTION_ABI } from "@/lib/contracts";

export function useDeclareCandidacy(electionAddress: `0x${string}`) {
  const { writeContract, data: hash, isPending, error } = useWriteContract();

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  function declareCandidacy(tokenId: bigint, name: string, platform: string) {
    writeContract({
      address: electionAddress,
      abi: SENATE_ELECTION_ABI,
      functionName: "declareCandidacy",
      args: [tokenId, name, platform],
    });
  }

  return {
    declareCandidacy,
    isPending,
    isConfirming,
    isSuccess,
    error,
    hash,
  };
}

export function useCastVote(electionAddress: `0x${string}`) {
  const { writeContract, data: hash, isPending, error } = useWriteContract();

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  function vote(tokenId: bigint, candidateIndex: bigint, comment: string) {
    writeContract({
      address: electionAddress,
      abi: SENATE_ELECTION_ABI,
      functionName: "vote",
      args: [tokenId, candidateIndex, comment],
    });
  }

  return { vote, isPending, isConfirming, isSuccess, error, hash };
}

export function useFinalizeElection(electionAddress: `0x${string}`) {
  const { writeContract, data: hash, isPending, error } = useWriteContract();

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  function finalize() {
    writeContract({
      address: electionAddress,
      abi: SENATE_ELECTION_ABI,
      functionName: "finalizeElection",
    });
  }

  return { finalize, isPending, isConfirming, isSuccess, error, hash };
}
