"use client";

import { useEnsName } from "wagmi";
import { type Candidate } from "@/hooks/useElection";

interface CandidateCardProps {
  candidate: Candidate;
  index: number;
  isWinner?: boolean;
  selected?: boolean;
  onSelect?: (index: number) => void;
  selectable?: boolean;
  nftImageUrl?: string;
}

export function CandidateCard({
  candidate,
  index,
  isWinner,
  selected,
  onSelect,
  selectable,
  nftImageUrl,
}: CandidateCardProps) {
  const { data: ensName } = useEnsName({ address: candidate.wallet });

  return (
    <div
      onClick={() => selectable && onSelect?.(index)}
      className={`p-6 rounded-xl border transition-all ${
        isWinner
          ? "border-yellow-500 bg-yellow-500/10"
          : selected
          ? "border-indigo-500 bg-indigo-500/10"
          : selectable
          ? "border-gray-700 bg-gray-900 hover:border-gray-500 cursor-pointer"
          : "border-gray-700 bg-gray-900"
      }`}
    >
      <div className="flex items-start gap-4">
        {nftImageUrl && (
          <img
            src={nftImageUrl}
            alt={`NFT #${candidate.nftTokenId.toString()}`}
            className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
          />
        )}
        {!nftImageUrl && candidate.profileImageUri && (
          <img
            src={candidate.profileImageUri}
            alt={`NFT #${candidate.nftTokenId.toString()}`}
            className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
          />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-lg text-white">
                  {candidate.name}
                </h3>
                {isWinner && (
                  <span className="px-2 py-0.5 text-xs font-medium bg-yellow-500/20 text-yellow-300 rounded-full">
                    Senator
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-500 mt-0.5 font-mono">
                {ensName ?? `${candidate.wallet.slice(0, 6)}...${candidate.wallet.slice(-4)}`}
              </p>
              <p className="text-sm text-gray-500">
                NFT #{candidate.nftTokenId.toString()}
              </p>
            </div>
            <div className="text-right">
              <span className="text-2xl font-bold text-white">
                {candidate.voteCount.toString()}
              </span>
              <p className="text-xs text-gray-500">votes</p>
            </div>
          </div>
        </div>
      </div>
      {candidate.platform && (
        <p className="mt-4 text-gray-300 text-sm whitespace-pre-wrap">
          {candidate.platform}
        </p>
      )}
    </div>
  );
}
