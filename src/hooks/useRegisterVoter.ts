"use client";

import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { SENATE_ELECTION_V2_ABI } from "@/lib/contracts";

export function useRegisterVoter(electionAddress: `0x${string}`) {
  const { writeContract, data: hash, isPending, error } = useWriteContract();

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  function registerVoter(tokenId: bigint, identityCommitment: bigint) {
    writeContract({
      address: electionAddress,
      abi: SENATE_ELECTION_V2_ABI,
      functionName: "registerVoter",
      args: [tokenId, identityCommitment],
    });
  }

  return {
    registerVoter,
    isPending,
    isConfirming,
    isSuccess,
    error,
    hash,
  };
}
