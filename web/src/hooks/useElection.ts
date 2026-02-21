"use client";

import { useReadContract, useReadContracts } from "wagmi";
import {
  ELECTION_FACTORY_ABI,
  ELECTION_FACTORY_ADDRESS,
  SENATE_ELECTION_ABI,
} from "@/lib/contracts";

export enum ElectionPhase {
  Registration = 0,
  Voting = 1,
  Finalized = 2,
}

export interface Candidate {
  wallet: `0x${string}`;
  nftTokenId: bigint;
  name: string;
  platform: string;
  profileImageUri: string;
  voteCount: bigint;
  registered: boolean;
}

export function useCurrentElection(nftContract: `0x${string}`) {
  const { data: cycleData } = useReadContract({
    address: ELECTION_FACTORY_ADDRESS,
    abi: ELECTION_FACTORY_ABI,
    functionName: "currentCycle",
    args: [nftContract],
  });

  const cycle = cycleData ? Number(cycleData) : 0;
  const electionCycle = cycle > 0 ? cycle - 1 : 0;

  const { data: electionAddress } = useReadContract({
    address: ELECTION_FACTORY_ADDRESS,
    abi: ELECTION_FACTORY_ABI,
    functionName: "getElection",
    args: [nftContract, BigInt(electionCycle)],
    query: { enabled: cycle > 0 },
  });

  return {
    electionAddress: electionAddress as `0x${string}` | undefined,
    cycle: electionCycle,
  };
}

export function useElection(electionAddress: `0x${string}` | undefined) {
  const enabled = !!electionAddress && electionAddress !== "0x0000000000000000000000000000000000000000";

  const { data, isLoading, refetch } = useReadContracts({
    contracts: [
      {
        address: electionAddress!,
        abi: SENATE_ELECTION_ABI,
        functionName: "phase",
      },
      {
        address: electionAddress!,
        abi: SENATE_ELECTION_ABI,
        functionName: "getCandidates",
      },
      {
        address: electionAddress!,
        abi: SENATE_ELECTION_ABI,
        functionName: "votingEndTime",
      },
      {
        address: electionAddress!,
        abi: SENATE_ELECTION_ABI,
        functionName: "getWinners",
      },
    ],
    query: { enabled },
  });

  const phase = data?.[0]?.result as number | undefined;
  const candidates = data?.[1]?.result as Candidate[] | undefined;
  const votingEndTime = data?.[2]?.result as bigint | undefined;
  const winners = data?.[3]?.result as readonly [`0x${string}`, `0x${string}`] | undefined;

  return {
    phase: phase as ElectionPhase | undefined,
    candidates: candidates ?? [],
    votingEndTime: votingEndTime ? Number(votingEndTime) : undefined,
    winners,
    isLoading,
    refetch,
  };
}

export function useCurrentSenators(nftContract: `0x${string}`) {
  const { data } = useReadContract({
    address: ELECTION_FACTORY_ADDRESS,
    abi: ELECTION_FACTORY_ABI,
    functionName: "getCurrentSenators",
    args: [nftContract],
  });

  return data as readonly [`0x${string}`, `0x${string}`] | undefined;
}
