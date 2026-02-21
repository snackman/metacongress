"use client";

import { useReadContract } from "wagmi";
import {
  OZ_GOVERNOR_ABI,
  GOVERNOR_BRAVO_ABI,
  SENATE_SAFE_ADDRESS,
} from "@/lib/contracts";
import type { GovernorType } from "@/lib/types";
import { getChainId } from "@/lib/constants";
import { useState } from "react";

export function useGovernorVoteStatus(
  governorAddress: `0x${string}` | undefined,
  proposalId: bigint | undefined,
  chain: string,
  governorType: GovernorType
) {
  const chainId = getChainId(chain);
  const enabled = !!governorAddress && !!proposalId;

  const { data: hasVoted } = useReadContract({
    address: governorAddress!,
    abi: OZ_GOVERNOR_ABI,
    functionName: "hasVoted",
    args: [proposalId!, SENATE_SAFE_ADDRESS],
    chainId,
    query: { enabled: enabled && governorType === "ozGovernor" },
  });

  // For GovernorBravo, use getReceipt instead
  const { data: receipt } = useReadContract({
    address: governorAddress!,
    abi: GOVERNOR_BRAVO_ABI,
    functionName: "getReceipt",
    args: [proposalId!, SENATE_SAFE_ADDRESS],
    chainId,
    query: { enabled: enabled && governorType === "governorBravo" },
  });

  const senateHasVoted =
    governorType === "ozGovernor"
      ? (hasVoted as boolean) ?? false
      : (receipt as { hasVoted: boolean } | undefined)?.hasVoted ?? false;

  return { hasVoted: senateHasVoted };
}

export function useGovernorVotingPower(
  governorAddress: `0x${string}` | undefined,
  proposalSnapshot: bigint | undefined,
  chain: string
) {
  const chainId = getChainId(chain);
  const enabled = !!governorAddress && !!proposalSnapshot;

  const { data } = useReadContract({
    address: governorAddress!,
    abi: OZ_GOVERNOR_ABI,
    functionName: "getVotes",
    args: [SENATE_SAFE_ADDRESS, proposalSnapshot!],
    chainId,
    query: { enabled },
  });

  return { votingPower: data as bigint | undefined };
}

export function useEncodeVote() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    to: string;
    data: string;
    value: string;
    chainId: number;
    description: string;
    safeTransactionServiceUrl: string;
  } | null>(null);

  async function encodeVote(params: {
    governorAddress: string;
    proposalId: string;
    support: number;
    reason?: string;
    governorType: GovernorType;
    chainId: number;
  }) {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/proposals/vote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to encode vote");
      }
      const data = await res.json();
      setResult(data);
      return data;
    } catch (err) {
      setError((err as Error).message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }

  return { encodeVote, isLoading, error, result };
}
