"use client";

import { useReadContract, useReadContracts } from "wagmi";
import {
  ELECTION_FACTORY_ABI,
  ELECTION_FACTORY_ADDRESS,
  SENATE_ALLOCATION_ABI,
} from "@/lib/contracts";

export interface AllocationCandidate {
  wallet: `0x${string}`;
  nftTokenId: bigint;
  name: string;
  platform: string;
  profileImageUri: string;
  voteCount: bigint;
  registered: boolean;
}

export function useAllocationAddress(nftContract: `0x${string}`) {
  const { data, isLoading } = useReadContract({
    address: ELECTION_FACTORY_ADDRESS,
    abi: ELECTION_FACTORY_ABI,
    functionName: "allocationContracts",
    args: [nftContract],
  });

  const address = data as `0x${string}` | undefined;
  const hasAllocation =
    !!address && address !== "0x0000000000000000000000000000000000000000";

  return { allocationAddress: hasAllocation ? address : undefined, isLoading };
}

export function useAllocation(
  allocationAddress: `0x${string}` | undefined
) {
  const enabled = !!allocationAddress;

  const { data, isLoading, refetch } = useReadContracts({
    contracts: [
      {
        address: allocationAddress!,
        abi: SENATE_ALLOCATION_ABI,
        functionName: "getCandidates",
      },
      {
        address: allocationAddress!,
        abi: SENATE_ALLOCATION_ABI,
        functionName: "totalVotes",
      },
      {
        address: allocationAddress!,
        abi: SENATE_ALLOCATION_ABI,
        functionName: "eligibilityRoot",
      },
      {
        address: allocationAddress!,
        abi: SENATE_ALLOCATION_ABI,
        functionName: "getCurrentSenators",
      },
    ],
    query: { enabled },
  });

  const candidates = (data?.[0]?.result as AllocationCandidate[] | undefined) ?? [];
  const totalVotes = (data?.[1]?.result as bigint | undefined) ?? 0n;
  const eligibilityRoot = (data?.[2]?.result as bigint | undefined) ?? 0n;
  const currentSenators = (data?.[3]?.result as [`0x${string}`, `0x${string}`] | undefined) ?? [
    "0x0000000000000000000000000000000000000000" as `0x${string}`,
    "0x0000000000000000000000000000000000000000" as `0x${string}`,
  ];

  return {
    candidates,
    totalVotes,
    eligibilityRoot,
    currentSenators,
    isLoading,
    refetch,
  };
}
