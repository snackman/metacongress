"use client";

import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { SENATE_ELECTION_V2_ABI, SENATE_ALLOCATION_ABI } from "@/lib/contracts";

export function useDeclareCandidacy(electionAddress: `0x${string}`) {
  const { writeContract, data: hash, isPending, error } = useWriteContract();

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  function declareCandidacy(tokenId: bigint, name: string, platform: string) {
    writeContract({
      address: electionAddress,
      abi: SENATE_ELECTION_V2_ABI,
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

export function useDeclareCandidacyAllocation(allocationAddress: `0x${string}`) {
  const { writeContract, data: hash, isPending, error } = useWriteContract();

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  function declareCandidacy(tokenId: bigint, name: string, platform: string) {
    writeContract({
      address: allocationAddress,
      abi: SENATE_ALLOCATION_ABI,
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

export function useOpenVoting(electionAddress: `0x${string}`) {
  const { writeContract, data: hash, isPending, error } = useWriteContract();

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  function openVoting() {
    writeContract({
      address: electionAddress,
      abi: SENATE_ELECTION_V2_ABI,
      functionName: "openVoting",
    });
  }

  return { openVoting, isPending, isConfirming, isSuccess, error, hash };
}

export function useFinalizeElection(electionAddress: `0x${string}`) {
  const { writeContract, data: hash, isPending, error } = useWriteContract();

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  function finalize() {
    writeContract({
      address: electionAddress,
      abi: SENATE_ELECTION_V2_ABI,
      functionName: "finalizeElection",
    });
  }

  return { finalize, isPending, isConfirming, isSuccess, error, hash };
}
