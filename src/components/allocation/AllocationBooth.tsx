"use client";

import { useState } from "react";
import { useAccount } from "wagmi";
import { useAllocationIdentity } from "@/hooks/useAllocationIdentity";
import { useAllocationCommitment } from "@/hooks/useAllocationCommitment";
import { useAllocateVote } from "@/hooks/useAllocateVote";
import type { BatchVoteResults } from "@/hooks/useAllocateVote";
import type { Identity } from "@semaphore-protocol/core";
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
    batchAllocateVote,
    withdrawVote,
    isBatchVoting,
    batchProgress,
    isGeneratingProof,
    isSending,
    isConfirming,
    isSuccess,
    error: voteError,
    reset,
  } = useAllocateVote(allocationAddress);
  const { data: nfts } = useNFTs(address, collectionAddress);

  const [checkedTokens, setCheckedTokens] = useState<Set<string>>(new Set());
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
  const [batchResults, setBatchResults] = useState<BatchVoteResults | null>(
    null
  );

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

  const isBusy =
    isRegistering ||
    isSubmitting ||
    isGeneratingProof ||
    isSending ||
    isConfirming ||
    isBatchVoting;

  // NFTs available for checking (not already voted, or withdrawn)
  const selectableTokens = nfts.filter(
    (nft) => !votedTokens.has(nft.tokenId) || withdrawnTokens.has(nft.tokenId)
  );

  function toggleToken(tokenId: string) {
    setCheckedTokens((prev) => {
      const next = new Set(prev);
      if (next.has(tokenId)) {
        next.delete(tokenId);
      } else {
        next.add(tokenId);
      }
      return next;
    });
  }

  function selectAll() {
    setCheckedTokens(new Set(selectableTokens.map((nft) => nft.tokenId)));
  }

  function deselectAll() {
    setCheckedTokens(new Set());
  }

  const allSelected =
    selectableTokens.length > 0 &&
    selectableTokens.every((nft) => checkedTokens.has(nft.tokenId));

  async function handleBatchVote(e: React.FormEvent) {
    e.preventDefault();
    if (selectedCandidate === null || checkedTokens.size === 0) return;

    setBatchResults(null);

    // Step 1: Register any unregistered tokens
    const tokensToRegister = Array.from(checkedTokens).filter(
      (tokenId) => !hasIdentity(tokenId) && !isSubmittedForToken(tokenId)
    );

    if (tokensToRegister.length > 0) {
      setIsRegistering(true);
      for (const tokenId of tokensToRegister) {
        try {
          await submitCommitment(tokenId);
        } catch {
          // If registration fails, remove from checked set and continue
          setCheckedTokens((prev) => {
            const next = new Set(prev);
            next.delete(tokenId);
            return next;
          });
        }
      }
      setIsRegistering(false);
    }

    // Step 2: Build the votes array from checked tokens that have identities
    const votes: Array<{ identity: Identity; tokenId: string }> = [];
    Array.from(checkedTokens).forEach((tokenId) => {
      const identity = identities.get(tokenId);
      if (identity) {
        votes.push({ identity, tokenId });
      }
    });

    if (votes.length === 0) return;

    // Step 3: Batch vote
    const results = await batchAllocateVote(
      votes,
      selectedCandidate,
      comment.trim()
    );

    // Mark succeeded tokens as voted
    if (results.succeeded.length > 0) {
      setVotedTokens((prev) => {
        const next = new Set(prev);
        for (const tokenId of results.succeeded) {
          next.add(tokenId);
        }
        return next;
      });
      setWithdrawnTokens((prev) => {
        const next = new Set(prev);
        for (const tokenId of results.succeeded) {
          next.delete(tokenId);
        }
        return next;
      });
    }

    // Clear checked tokens and show results
    setCheckedTokens(new Set());
    setBatchResults(results);
    if (results.failed.length === 0) {
      setSelectedCandidate(null);
      setComment("");
    }
  }

  async function handleWithdraw(tokenId: string) {
    const identity = identities.get(tokenId);
    if (!identity) return;

    setWithdrawingTokenId(tokenId);
    await withdrawVote(identity);
  }

  // After successful withdrawal, mark token accordingly and reset
  if (isSuccess && withdrawingTokenId) {
    const justWithdrawnToken = withdrawingTokenId;
    setWithdrawnTokens((prev) => new Set(prev).add(justWithdrawnToken));
    setVotedTokens((prev) => {
      const next = new Set(prev);
      next.delete(justWithdrawnToken);
      return next;
    });
    setWithdrawingTokenId(null);
    reset();
  }

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-white">
        Allocate Your Votes
      </h3>
      <p className="text-sm text-gray-400">
        You get 1 vote per NFT you own. Select NFTs, pick a candidate, then
        vote all at once.
      </p>

      {/* Select All / Deselect All */}
      {selectableTokens.length > 1 && (
        <div className="flex gap-2">
          <button
            onClick={allSelected ? deselectAll : selectAll}
            disabled={isBusy}
            className="text-xs text-indigo-400 hover:text-indigo-300 disabled:text-gray-600 transition-colors"
          >
            {allSelected ? "Deselect All" : "Select All"}
          </button>
        </div>
      )}

      {/* NFT list with checkboxes */}
      <div className="space-y-2">
        {nfts.map((nft) => {
          const tokenId = nft.tokenId;
          const hasVoted =
            votedTokens.has(tokenId) && !withdrawnTokens.has(tokenId);
          const isChecked = checkedTokens.has(tokenId);

          return (
            <div
              key={tokenId}
              className={`flex items-center justify-between p-3 rounded-lg border ${
                isChecked
                  ? "border-indigo-500 bg-indigo-500/10"
                  : hasVoted
                  ? "border-green-700 bg-green-900/10"
                  : "border-gray-800 bg-gray-900"
              }`}
            >
              <div className="flex items-center gap-3">
                {/* Checkbox for selectable NFTs */}
                {!hasVoted ? (
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => toggleToken(tokenId)}
                    disabled={isBusy}
                    className="w-4 h-4 rounded border-gray-600 bg-gray-800 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-0 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                  />
                ) : (
                  <div className="w-4" />
                )}

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

              {hasVoted ? (
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
              ) : isChecked ? (
                <span className="text-xs text-indigo-400 font-medium">
                  Selected
                </span>
              ) : null}
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

      {/* Candidate selection — shown when any tokens are checked */}
      {checkedTokens.size > 0 && candidates.length > 0 && (
        <div className="space-y-4">
          <h4 className="text-sm font-medium text-gray-400">
            Select a candidate
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
                  onSelect={isBusy ? undefined : setSelectedCandidate}
                  selectable={!isBusy}
                  nftImageUrl={candidate.profileImageUri || undefined}
                />
              );
            })}

          {/* Cast vote form */}
          {selectedCandidate !== null && (
            <form onSubmit={handleBatchVote} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">
                  Comment (optional, max 280 chars)
                </label>
                <textarea
                  maxLength={280}
                  rows={2}
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  disabled={isBusy}
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:border-indigo-500 focus:outline-none resize-none disabled:opacity-50"
                  placeholder="Why are you voting for this candidate?"
                />
              </div>

              <button
                type="submit"
                disabled={isBusy}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-700 disabled:text-gray-500 rounded-lg font-semibold transition-colors"
              >
                {isRegistering
                  ? "Registering NFTs..."
                  : `Vote with ${checkedTokens.size} NFT${checkedTokens.size !== 1 ? "s" : ""}`}
              </button>

              {/* Batch progress */}
              {isBatchVoting && batchProgress && (
                <div className="space-y-2">
                  <div className="w-full bg-gray-800 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-indigo-500 h-2 rounded-full transition-all duration-300"
                      style={{
                        width: `${(batchProgress.current / batchProgress.total) * 100}%`,
                      }}
                    />
                  </div>
                  <p className="text-sm text-gray-400 text-center">
                    NFT #{batchProgress.tokenId} — {batchProgress.phase}
                    <span className="text-gray-600 ml-2">
                      ({batchProgress.current} / {batchProgress.total})
                    </span>
                  </p>
                </div>
              )}

              {isRegistering && (
                <p className="text-xs text-gray-500 text-center">
                  Sign the message for each NFT to register it for voting
                </p>
              )}
            </form>
          )}
        </div>
      )}

      {/* Batch results */}
      {batchResults && (
        <div className="space-y-2">
          {batchResults.succeeded.length > 0 && (
            <div className="p-3 rounded-lg bg-green-900/20 border border-green-800">
              <p className="text-sm text-green-300">
                {batchResults.succeeded.length} vote
                {batchResults.succeeded.length !== 1 ? "s" : ""} cast
                successfully.
              </p>
            </div>
          )}
          {batchResults.failed.length > 0 && (
            <div className="p-3 rounded-lg bg-red-900/20 border border-red-800 space-y-1">
              <p className="text-sm text-red-300">
                {batchResults.failed.length} vote
                {batchResults.failed.length !== 1 ? "s" : ""} failed:
              </p>
              {batchResults.failed.map(({ tokenId, error }) => (
                <p key={tokenId} className="text-xs text-red-400">
                  NFT #{tokenId}:{" "}
                  {error.includes("SameCandidate")
                    ? "Already voted for this candidate"
                    : error}
                </p>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Summary */}
      {votedTokens.size > 0 && !batchResults && (
        <div className="p-3 rounded-lg bg-green-900/20 border border-green-800">
          <p className="text-sm text-green-300">
            {votedTokens.size} of {nfts.length} NFT
            {nfts.length !== 1 ? "s" : ""} voted.
            {withdrawnTokens.size > 0 && (
              <span className="text-yellow-300">
                {" "}
                {withdrawnTokens.size} withdrawn.
              </span>
            )}
            {" "}All votes are anonymous.
          </p>
        </div>
      )}
    </div>
  );
}
