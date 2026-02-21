"use client";

import { useReadContract } from "wagmi";
import { ERC20_VOTES_ABI, SENATE_SAFE_ADDRESS } from "@/lib/contracts";
import { getChainId } from "@/lib/constants";
import { formatUnits } from "viem";

interface VotingPowerCardProps {
  tokenAddress: `0x${string}`;
  tokenName: string;
  tokenSymbol: string;
  chain?: string;
}

export function VotingPowerCard({
  tokenAddress,
  tokenName,
  tokenSymbol,
  chain,
}: VotingPowerCardProps) {
  const chainId = chain ? getChainId(chain) : undefined;

  // Standard ERC20Votes: getVotes
  const { data: votesStandard } = useReadContract({
    address: tokenAddress,
    abi: ERC20_VOTES_ABI,
    functionName: "getVotes",
    args: [SENATE_SAFE_ADDRESS],
    chainId,
  });

  // Legacy (UNI, COMP): getCurrentVotes
  const { data: votesLegacy } = useReadContract({
    address: tokenAddress,
    abi: ERC20_VOTES_ABI,
    functionName: "getCurrentVotes",
    args: [SENATE_SAFE_ADDRESS],
    chainId,
  });

  const votes = votesStandard ?? votesLegacy;

  const { data: decimals } = useReadContract({
    address: tokenAddress,
    abi: ERC20_VOTES_ABI,
    functionName: "decimals",
    chainId,
  });

  const formattedVotes = votes
    ? Number(formatUnits(votes, Number(decimals ?? 18))).toLocaleString(
        undefined,
        { maximumFractionDigits: 0 }
      )
    : "0";

  return (
    <div className="p-4 rounded-xl bg-gray-900 border border-gray-800">
      <p className="text-sm text-gray-500">{tokenName}</p>
      <p className="text-2xl font-bold text-white mt-1">
        {formattedVotes}{" "}
        <span className="text-sm text-gray-500 font-normal">
          {tokenSymbol}
        </span>
      </p>
    </div>
  );
}
