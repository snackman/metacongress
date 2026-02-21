"use client";

import {
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import {
  ELECTION_FACTORY_ABI,
  ELECTION_FACTORY_ADDRESS,
} from "@/lib/contracts";

export interface Proposal {
  proposer: `0x${string}`;
  title: string;
  description: string;
  timestamp: bigint;
  yesVotes: bigint;
  noVotes: bigint;
  executed: boolean;
  nftContract: `0x${string}`;
  tokenId: bigint;
}

export function useProposals() {
  const { data, isLoading, refetch } = useReadContract({
    address: ELECTION_FACTORY_ADDRESS,
    abi: ELECTION_FACTORY_ABI,
    functionName: "getProposals",
  });

  return {
    proposals: (data as Proposal[] | undefined) ?? [],
    isLoading,
    refetch,
  };
}

export function useProposalCount() {
  const { data } = useReadContract({
    address: ELECTION_FACTORY_ADDRESS,
    abi: ELECTION_FACTORY_ABI,
    functionName: "getProposalCount",
  });

  return data ? Number(data) : 0;
}

export function useCreateProposal() {
  const { writeContract, data: hash, isPending, error } = useWriteContract();

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  function createProposal(
    title: string,
    description: string,
    nftContract: `0x${string}`,
    tokenId: bigint
  ) {
    writeContract({
      address: ELECTION_FACTORY_ADDRESS,
      abi: ELECTION_FACTORY_ABI,
      functionName: "createProposal",
      args: [title, description, nftContract, tokenId],
    });
  }

  return {
    createProposal,
    isPending,
    isConfirming,
    isSuccess,
    error,
    hash,
  };
}

export function useVoteOnProposal() {
  const { writeContract, data: hash, isPending, error } = useWriteContract();

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  function voteOnProposal(proposalId: bigint, support: boolean) {
    writeContract({
      address: ELECTION_FACTORY_ADDRESS,
      abi: ELECTION_FACTORY_ABI,
      functionName: "voteOnProposal",
      args: [proposalId, support],
    });
  }

  return {
    voteOnProposal,
    isPending,
    isConfirming,
    isSuccess,
    error,
    hash,
  };
}
