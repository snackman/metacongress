"use client";

import { useState } from "react";
import { useAccount } from "wagmi";
import { useAllocationIdentity } from "@/hooks/useAllocationIdentity";
import { useAllocationCommitment } from "@/hooks/useAllocationCommitment";
import { useAllocateVote } from "@/hooks/useAllocateVote";
import { useNFTs } from "@/hooks/useNFTs";
import { type AllocationCandidate } from "@/hooks/useAllocation";
import { CandidateCard } from "@/components/election/CandidateCard";

interface AllocationBoothProps {
  allocationAddress: `0x${string}`;
  candidates: AllocationCandidate[];
  collectionAddress: string;
}

export function AllocationBooth({
  allocationAddress,
  candidates,
  collectionAddress,
}: AllocationBoothProps) {
  const { address } = useAccount();
  const { identities, hasIdentity } =
    useAllocationIdentity(allocationAddress);
  const {
    submitCommitment,
    isSubmitting,
    isSubmittedForToken,
    error: commitmentError,
  } = useAllocationCommitment(
    allocationAddress,
    collectionAddress as `0x${string}`
  );
  const {
    allocateVote,
    withdrawVote,
    isGeneratingProof,
    isSending,
    isConfirming,
    isSuccess,
    error: voteError,
    reset,
  } = useAllocateVote(allocationAddress);
  const { data: nfts } = useNFTs(address, collectionAddress);

  const [activeTokenId, setActiveTokenId] = useState<string | null>(null);
  const [selectedCandidate, setSelectedCandidate] = useState<number | null>(
    null
  );
  const [comment, setComment] = useState("");
  const [votedTokens, setVotedTokens] = useState<Set<string>>(new Set());
  const [withdrawingTokenId, setWithdrawingTokenId] = useState<string | null>(
    null
  );
  const [withdrawnTokens, setWithdrawnTokens] = useState<Set<string>>(
    new Set()
  );
  const [isRegistering, setIsRegistering] = useState(false);

  if (!address) {
    return (
      <div className="p-6 rounded-xl bg-gray-900 border border-gray-800 text-center">
        <p className="text-gray-400">Connect your wallet to allocate votes</p>
      </div>
    );
  }

  if (!nfts || nfts.length === 0) {
    return (
      <div className="p-6 rounded-xl bg-gray-900 border border-gray-800 text-center">
        <p className="text-gray-400">
          You don&apos;t own any NFTs from this collection.
        </p>
      </div>
    );
  }

  const isBusy = isRegistering || isSubmitting || isGeneratingProof || isSending || isConfirming;

  async function handleSelectToken(tokenId: string) {
    const isUnlocked = hasIdentity(tokenId) || isSubmittedForToken(tokenId);

    if (!isUnlocked) {
      // Auto-register: submit commitment + create identity transparently
      setIsRegistering(true);
      try {
        await submitCommitment(tokenId);
      } catch {
        setIsRegistering(false);
        return;
      }
      setIsRegistering(false);
    }

    setActiveTokenId(tokenId);
    setSelectedCandidate(null);
    setComment("");
  }

  async function handleVote(e: React.FormEvent) {
    e.preventDefault();
    if (selectedCandidate === null || !activeTokenId) return;

    const identity = identities.get(activeTokenId);
    if (!identity) return;

    await allocateVote(identity, selectedCandidate, comment.trim());
  }

  async function handleWithdraw(tokenId: string) {
    const identity = identities.get(tokenId);
    if (!identity) return;

    setWithdrawingTokenId(tokenId);
    await withdrawVote(identity);
  }

  // After successful vote or withdrawal, mark token accordingly and reset
  if (isSuccess && (activeTokenId || withdrawingTokenId)) {
    if (withdrawingTokenId) {
      const justWithdrawnToken = withdrawingTokenId;
      setWithdrawnTokens((prev) => new Set(prev).add(justWithdrawnToken));
      setVotedTokens((prev) => {
        const next = new Set(prev);
        next.delete(justWithdrawnToken);
        return next;
      });
      setWithdrawingTokenId(null);
    } else if (activeTokenId) {
      const justVotedToken = activeTokenId;
      setVotedTokens((prev) => new Set(prev).add(justVotedToken));
      setWithdrawnTokens((prev) => {
        const next = new Set(prev);
        next.delete(justVotedToken);
        return next;
      });
      setActiveTokenId(null);
    }
    setSelectedCandidate(null);
    setComment("");
    reset();
  }

  const activeIdentity = activeTokenId
    ? identities.get(activeTokenId)
    : null;

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-white">
        Allocate Your Votes
      </h3>
      <p className="text-sm text-gray-400">
        You get 1 vote per NFT you own. Select an NFT to cast its vote.
      </p>

      {/* NFT list with status */}
      <div className="space-y-2">
        {nfts.map((nft) => {
          const tokenId = nft.tokenId;
          const hasVoted = votedTokens.has(tokenId);
          const isActive = activeTokenId === tokenId;

          return (
            <div
              key={tokenId}
              className={`flex items-center justify-between p-3 rounded-lg border ${
                isActive
                  ? "border-indigo-500 bg-indigo-500/10"
                  : hasVoted
                  ? "border-green-700 bg-green-900/10"
                  : "border-gray-800 bg-gray-900"
              }`}
            >
              <div className="flex items-center gap-3">
                {nft.image?.thumbnailUrl ? (
                  <img
                    src={nft.image.thumbnailUrl}
                    alt={`#${tokenId}`}
                    className="w-8 h-8 rounded object-cover"
                  />
                ) : (
                  <div className="w-8 h-8 rounded bg-gray-800" />
                )}
                <span className="text-white font-mono text-sm">
                  #{tokenId}
                </span>
              </div>

              {hasVoted && !withdrawnTokens.has(tokenId) ? (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-green-400 font-medium">
                    Voted
                  </span>
                  <button
                    onClick={() => handleWithdraw(tokenId)}
                    disabled={isBusy || withdrawingTokenId === tokenId}
                    className="px-2 py-1 text-xs bg-red-700 hover:bg-red-600 disabled:bg-gray-800 disabled:text-gray-600 rounded font-medium transition-colors"
                  >
                    {withdrawingTokenId === tokenId
                      ? "Withdrawing..."
                      : "Withdraw"}
                  </button>
                </div>
              ) : isActive ? (
                <span className="text-xs text-indigo-400 font-medium">
                  Voting...
                </span>
              ) : (
                <button
                  onClick={() => handleSelectToken(tokenId)}
                  disabled={isBusy}
                  className="px-3 py-1 text-xs bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-800 disabled:text-gray-600 rounded font-medium transition-colors"
                >
                  {isRegistering ? "Preparing..." : "Vote"}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {commitmentError && (
        <p className="text-red-400 text-sm">{commitmentError}</p>
      )}

      {voteError && withdrawingTokenId && (
        <p className="text-red-400 text-sm">
          {voteError.message.includes("NoExistingVote")
            ? "This NFT has no existing vote to withdraw."
            : "Withdrawal failed. Please try again."}
        </p>
      )}

      {/* Candidate selection — shown when a token is active */}
      {activeTokenId && activeIdentity && candidates.length > 0 && (
        <div className="space-y-4">
          <h4 className="text-sm font-medium text-gray-400">
            Select a candidate for NFT #{activeTokenId}
          </h4>
          {candidates
            .slice()
            .sort((a, b) => Number(b.voteCount - a.voteCount))
            .map((candidate) => {
              const originalIndex = candidates.indexOf(candidate);
              return (
                <CandidateCard
                  key={originalIndex}
                  candidate={candidate}
                  index={originalIndex}
                  selected={selectedCandidate === originalIndex}
                  onSelect={setSelectedCandidate}
                  selectable
                  nftImageUrl={candidate.profileImageUri || undefined}
                />
              );
            })}

          {/* Cast vote form */}
          {selectedCandidate !== null && (
            <form onSubmit={handleVote} className="space-y-4">
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
                disabled={isBusy}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-700 disabled:text-gray-500 rounded-lg font-semibold transition-colors"
              >
                {isGeneratingProof
                  ? "Generating ZK proof..."
                  : isSending
                  ? "Submitting vote..."
                  : isConfirming
                  ? "Confirming on-chain..."
                  : `Allocate Vote (NFT #${activeTokenId})`}
              </button>

              {isGeneratingProof && (
                <p className="text-xs text-gray-500 text-center">
                  Proof generation may take 5-15 seconds
                </p>
              )}

              {voteError && !withdrawingTokenId && (
                <p className="text-red-400 text-sm">
                  {voteError.message.includes("SameCandidate")
                    ? "This NFT already voted for this candidate. Choose a different one to reallocate."
                    : "Vote failed. Please try again."}
                </p>
              )}
            </form>
          )}
        </div>
      )}

      {/* Summary */}
      {(votedTokens.size > 0 || withdrawnTokens.size > 0) && (
        <div className="p-3 rounded-lg bg-green-900/20 border border-green-800">
          <p className="text-sm text-green-300">
            {votedTokens.size} of {nfts.length} NFT
            {nfts.length !== 1 ? "s" : ""} voted.
            {withdrawnTokens.size > 0 && (
              <span className="text-yellow-300">
                {" "}{withdrawnTokens.size} withdrawn.
              </span>
            )}
            {" "}All votes are anonymous.
          </p>
        </div>
      )}
    </div>
  );
}
