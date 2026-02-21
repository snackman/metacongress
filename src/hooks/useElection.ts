"use client";

import { useReadContract, useReadContracts } from "wagmi";
import {
  ELECTION_FACTORY_ABI,
  ELECTION_FACTORY_ADDRESS,
  SENATE_ELECTION_V2_ABI,
  SENATE_ELECTION_V3_ABI,
} from "@/lib/contracts";

export enum ElectionPhase {
  Registration = 0,
  VoterRegistration = 1,
  Voting = 2,
  Finalized = 3,
}

// V3 phases map differently: Registration=0, Voting=1, Finalized=2
export enum ElectionPhaseV3 {
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

  // Try reading commitmentDeadline to detect V3
  const { data: commitmentDeadlineData } = useReadContract({
    address: electionAddress!,
    abi: SENATE_ELECTION_V3_ABI,
    functionName: "commitmentDeadline",
    query: { enabled },
  });

  // If commitmentDeadline read succeeds (returns a value), it's V3
  const isV3 = commitmentDeadlineData !== undefined;

  // Read V2 fields (works for both V2 and V3 for shared fields)
  const { data, isLoading, refetch } = useReadContracts({
    contracts: [
      {
        address: electionAddress!,
        abi: SENATE_ELECTION_V2_ABI,
        functionName: "phase",
      },
      {
        address: electionAddress!,
        abi: SENATE_ELECTION_V2_ABI,
        functionName: "getCandidates",
      },
      {
        address: electionAddress!,
        abi: SENATE_ELECTION_V2_ABI,
        functionName: "votingEndTime",
      },
      {
        address: electionAddress!,
        abi: SENATE_ELECTION_V2_ABI,
        functionName: "getWinners",
      },
      {
        address: electionAddress!,
        abi: SENATE_ELECTION_V2_ABI,
        functionName: "voterRegistrationEndTime",
      },
      {
        address: electionAddress!,
        abi: SENATE_ELECTION_V2_ABI,
        functionName: "groupId",
      },
      {
        address: electionAddress!,
        abi: SENATE_ELECTION_V2_ABI,
        functionName: "totalVotes",
      },
    ],
    query: { enabled },
  });

  // Read V3-specific fields
  const { data: v3Data } = useReadContracts({
    contracts: [
      {
        address: electionAddress!,
        abi: SENATE_ELECTION_V3_ABI,
        functionName: "commitmentDeadline",
      },
      {
        address: electionAddress!,
        abi: SENATE_ELECTION_V3_ABI,
        functionName: "eligibilityRoot",
      },
    ],
    query: { enabled: enabled && isV3 },
  });

  const rawPhase = data?.[0]?.result as number | undefined;
  const candidates = data?.[1]?.result as Candidate[] | undefined;
  const votingEndTime = data?.[2]?.result as bigint | undefined;
  const winners = data?.[3]?.result as readonly [`0x${string}`, `0x${string}`] | undefined;
  const voterRegistrationEndTime = data?.[4]?.result as bigint | undefined;
  const groupId = data?.[5]?.result as bigint | undefined;
  const totalVotes = data?.[6]?.result as bigint | undefined;
  const commitmentDeadline = v3Data?.[0]?.result as bigint | undefined;
  const eligibilityRoot = v3Data?.[1]?.result as bigint | undefined;

  // Normalize V3 phases to V2 enum for backward compatibility in the UI
  let phase: ElectionPhase | undefined;
  if (rawPhase !== undefined) {
    if (isV3) {
      // V3: Registration=0, Voting=1, Finalized=2
      // Map to: Registration=0, Voting=2, Finalized=3
      if (rawPhase === ElectionPhaseV3.Registration) phase = ElectionPhase.Registration;
      else if (rawPhase === ElectionPhaseV3.Voting) phase = ElectionPhase.Voting;
      else if (rawPhase === ElectionPhaseV3.Finalized) phase = ElectionPhase.Finalized;
    } else {
      phase = rawPhase as ElectionPhase;
    }
  }

  return {
    phase,
    candidates: candidates ?? [],
    votingEndTime: votingEndTime ? Number(votingEndTime) : undefined,
    winners,
    voterRegistrationEndTime: voterRegistrationEndTime ? Number(voterRegistrationEndTime) : undefined,
    groupId,
    totalVotes: totalVotes ? Number(totalVotes) : 0,
    isLoading,
    refetch,
    electionVersion: isV3 ? (3 as const) : (2 as const),
    commitmentDeadline: commitmentDeadline ? Number(commitmentDeadline) : undefined,
    eligibilityRoot,
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
