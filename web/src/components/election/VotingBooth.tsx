"use client";

import { useState } from "react";
import { useCastVote } from "@/hooks/useVote";
import { useNFTs } from "@/hooks/useNFTs";
import { useAccount } from "wagmi";
import { type Candidate } from "@/hooks/useElection";
import { CandidateCard } from "./CandidateCard";
import type { OwnedNft } from "alchemy-sdk";

interface VotingBoothProps {
  electionAddress: `0x${string}`;
  nftContractAddress: string;
  candidates: Candidate[];
  votingEndTime: number;
}

export function VotingBooth({
  electionAddress,
  nftContractAddress,
  candidates,
  votingEndTime,
}: VotingBoothProps) {
  const { address } = useAccount();
  const { data: nfts } = useNFTs(address, nftContractAddress);
  const { vote, isPending, isConfirming, isSuccess } =
    useCastVote(electionAddress);

  const [selectedCandidate, setSelectedCandidate] = useState<number | null>(
    null
  );
  const [selectedToken, setSelectedToken] = useState<OwnedNft | null>(null);
  const [comment, setComment] = useState("");

  const timeLeft = votingEndTime * 1000 - Date.now();
  const votingEnded = timeLeft <= 0;

  if (!address) {
    return (
      <div className="p-6 rounded-xl bg-gray-900 border border-gray-800 text-center">
        <p className="text-gray-400">Connect your wallet to vote</p>
      </div>
    );
  }

  function handleVote(e: React.FormEvent) {
    e.preventDefault();
    if (selectedCandidate === null || !selectedToken) return;
    vote(BigInt(selectedToken.tokenId), BigInt(selectedCandidate), comment.trim());
  }

  if (isSuccess) {
    return (
      <div className="p-6 rounded-xl bg-green-900/30 border border-green-700 text-center">
        <p className="text-green-300 font-semibold">Vote cast successfully!</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">Cast Your Vote</h3>
        <span
          className={`text-sm ${
            votingEnded ? "text-red-400" : "text-indigo-400"
          }`}
        >
          {votingEnded
            ? "Voting ended"
            : `Ends ${new Date(votingEndTime * 1000).toLocaleDateString()}`}
        </span>
      </div>

      <div className="space-y-4">
        {candidates.map((candidate, i) => (
          <CandidateCard
            key={i}
            candidate={candidate}
            index={i}
            selected={selectedCandidate === i}
            onSelect={setSelectedCandidate}
            selectable={!votingEnded}
          />
        ))}
      </div>

      {!votingEnded && selectedCandidate !== null && (
        <form onSubmit={handleVote} className="space-y-4">
          {nfts && nfts.length > 0 && (
            <div>
              <label className="block text-sm text-gray-400 mb-2">
                Vote with NFT
              </label>
              <div className="flex gap-2 flex-wrap">
                {nfts.map((nft) => (
                  <button
                    key={nft.tokenId}
                    type="button"
                    onClick={() => setSelectedToken(nft)}
                    className={`px-3 py-1.5 rounded-lg border text-sm ${
                      selectedToken?.tokenId === nft.tokenId
                        ? "border-indigo-500 bg-indigo-500/10"
                        : "border-gray-700 hover:border-gray-500"
                    }`}
                  >
                    #{nft.tokenId}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm text-gray-400 mb-1">
              Comment (optional, max 280 chars)
            </label>
            <textarea
              maxLength={280}
              rows={2}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:border-indigo-500 focus:outline-none resize-none"
              placeholder="Why are you voting for this candidate?"
            />
          </div>

          <button
            type="submit"
            disabled={!selectedToken || isPending || isConfirming}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-700 disabled:text-gray-500 rounded-lg font-semibold transition-colors"
          >
            {isPending
              ? "Confirm in wallet..."
              : isConfirming
              ? "Confirming..."
              : "Cast Vote"}
          </button>
        </form>
      )}
    </div>
  );
}
