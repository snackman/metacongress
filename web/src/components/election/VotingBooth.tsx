"use client";

import { useState } from "react";
import { useAccount } from "wagmi";
import { useIdentity } from "@/hooks/useIdentity";
import { useAnonymousVote } from "@/hooks/useAnonymousVote";
import { type Candidate } from "@/hooks/useElection";
import { CandidateCard } from "./CandidateCard";

interface VotingBoothProps {
  electionAddress: `0x${string}`;
  candidates: Candidate[];
  votingEndTime: number;
  groupId: bigint | undefined;
  collectionAddress: string;
}

export function VotingBooth(props: VotingBoothProps) {
  const { electionAddress, candidates, votingEndTime, groupId } = props;
  const { address } = useAccount();
  const { identity, hasIdentity, createIdentity, isCreating } =
    useIdentity(electionAddress);
  const {
    castVote,
    isGeneratingProof,
    isSending,
    isConfirming,
    isSuccess,
    error,
  } = useAnonymousVote(electionAddress, groupId);

  const [selectedCandidate, setSelectedCandidate] = useState<number | null>(
    null
  );
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

  if (isSuccess) {
    return (
      <div className="p-6 rounded-xl bg-green-900/30 border border-green-700 text-center">
        <p className="text-green-300 font-semibold">Anonymous vote cast successfully!</p>
        <p className="text-gray-400 text-sm mt-2">
          Your vote is completely private — no one can link it to your identity.
        </p>
      </div>
    );
  }

  const isBusy = isGeneratingProof || isSending || isConfirming;

  async function handleVote(e: React.FormEvent) {
    e.preventDefault();
    if (selectedCandidate === null || !identity) return;
    await castVote(identity, selectedCandidate, comment.trim());
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">Cast Anonymous Vote</h3>
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

      {/* Identity check */}
      {!hasIdentity && !votingEnded && (
        <div className="p-4 rounded-lg bg-gray-900 border border-gray-800">
          <p className="text-sm text-gray-400 mb-3">
            Re-derive your anonymous identity to cast your vote.
          </p>
          <button
            onClick={createIdentity}
            disabled={isCreating}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-700 disabled:text-gray-500 rounded-lg font-semibold transition-colors"
          >
            {isCreating ? "Sign message in wallet..." : "Unlock Identity"}
          </button>
        </div>
      )}

      <div className="space-y-4">
        {candidates.map((candidate, i) => (
          <CandidateCard
            key={i}
            candidate={candidate}
            index={i}
            selected={selectedCandidate === i}
            onSelect={setSelectedCandidate}
            selectable={!votingEnded && hasIdentity}
            nftImageUrl={candidate.profileImageUri || undefined}
          />
        ))}
      </div>

      {!votingEnded && hasIdentity && selectedCandidate !== null && (
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
              ? "Confirm in wallet..."
              : isConfirming
              ? "Confirming..."
              : "Cast Anonymous Vote"}
          </button>

          {isGeneratingProof && (
            <p className="text-xs text-gray-500 text-center">
              Proof generation may take 5-15 seconds
            </p>
          )}

          {error && (
            <p className="text-red-400 text-sm">
              {error.message.includes("DuplicateNullifier")
                ? "You have already voted in this election."
                : "Vote failed. Please try again."}
            </p>
          )}
        </form>
      )}
    </div>
  );
}
