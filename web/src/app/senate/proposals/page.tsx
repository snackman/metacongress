"use client";

import { useState, useEffect } from "react";
import { useAccount, useEnsName } from "wagmi";
import { useIsSenator } from "@/hooks/useSenator";
import {
  useProposals,
  useCreateProposal,
  useVoteOnProposal,
  type Proposal,
} from "@/hooks/useProposals";
import { SUPPORTED_COLLECTIONS, getCollectionByAddress } from "@/lib/constants";
import { NftPicker } from "@/components/NftPicker";

function truncateAddress(address: string) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function formatTimestamp(timestamp: bigint) {
  const date = new Date(Number(timestamp) * 1000);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function ProposerName({ address }: { address: `0x${string}` }) {
  const { data: ensName } = useEnsName({ address });
  return <>{ensName ?? truncateAddress(address)}</>;
}

function CreateProposalForm({ onSuccess }: { onSuccess: () => void }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedCollection, setSelectedCollection] = useState(
    SUPPORTED_COLLECTIONS[0].address as string
  );
  const [tokenId, setTokenId] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const { createProposal, isPending, isConfirming, isSuccess, error } =
    useCreateProposal();

  useEffect(() => {
    if (isSuccess) {
      setTitle("");
      setDescription("");
      setTokenId(null);
      setIsOpen(false);
      onSuccess();
    }
  }, [isSuccess, onSuccess]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !description.trim() || !tokenId) return;
    createProposal(
      title.trim(),
      description.trim(),
      selectedCollection as `0x${string}`,
      BigInt(tokenId)
    );
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="w-full px-5 py-3 bg-indigo-600 hover:bg-indigo-500 rounded-lg font-semibold text-sm transition-colors text-white"
      >
        Create New Proposal
      </button>
    );
  }

  return (
    <div className="rounded-xl bg-gray-900 border border-gray-800 p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-white">Create Proposal</h2>
        <button
          onClick={() => setIsOpen(false)}
          className="text-gray-400 hover:text-gray-200 text-sm"
        >
          Cancel
        </button>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Title
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Proposal title"
            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe your proposal..."
            rows={4}
            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            NFT Collection
          </label>
          <select
            value={selectedCollection}
            onChange={(e) => {
              setSelectedCollection(e.target.value);
              setTokenId(null);
            }}
            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          >
            {SUPPORTED_COLLECTIONS.map((c) => (
              <option key={c.address} value={c.address}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Select Your NFT
          </label>
          <NftPicker
            memberCollection={selectedCollection}
            selectedTokenId={tokenId}
            onSelect={(id) => setTokenId(id)}
          />
        </div>
        <p className="text-xs text-gray-500">
          You must own an NFT from a whitelisted collection to create a
          proposal.
        </p>
        {error && (
          <div className="p-3 rounded-lg bg-red-900/30 border border-red-700">
            <p className="text-red-300 text-sm">
              {(error as Error).message?.includes("User rejected")
                ? "Transaction rejected by user."
                : "Failed to create proposal. Make sure you own the specified NFT."}
            </p>
          </div>
        )}
        <button
          type="submit"
          disabled={isPending || isConfirming || !tokenId}
          className="w-full px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800 disabled:cursor-not-allowed rounded-lg font-semibold text-sm transition-colors text-white"
        >
          {isPending
            ? "Confirm in Wallet..."
            : isConfirming
            ? "Submitting..."
            : "Submit Proposal"}
        </button>
      </form>
    </div>
  );
}

function VoteButtons({
  proposalIndex,
  isSenator,
}: {
  proposalIndex: number;
  isSenator: boolean;
}) {
  const { voteOnProposal, isPending, isConfirming, isSuccess, error } =
    useVoteOnProposal();

  if (!isSenator) return null;

  if (isSuccess) {
    return (
      <p className="text-green-400 text-sm font-medium">Vote recorded!</p>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <button
          onClick={() => voteOnProposal(BigInt(proposalIndex), true)}
          disabled={isPending || isConfirming}
          className="flex-1 px-3 py-1.5 bg-green-700 hover:bg-green-600 disabled:bg-green-900 disabled:cursor-not-allowed rounded-lg text-sm font-medium transition-colors text-white"
        >
          {isPending || isConfirming ? "..." : "Vote Yes"}
        </button>
        <button
          onClick={() => voteOnProposal(BigInt(proposalIndex), false)}
          disabled={isPending || isConfirming}
          className="flex-1 px-3 py-1.5 bg-red-700 hover:bg-red-600 disabled:bg-red-900 disabled:cursor-not-allowed rounded-lg text-sm font-medium transition-colors text-white"
        >
          {isPending || isConfirming ? "..." : "Vote No"}
        </button>
      </div>
      {error && (
        <p className="text-red-400 text-xs">
          {(error as Error).message?.includes("User rejected")
            ? "Transaction rejected."
            : "Vote failed. You may have already voted."}
        </p>
      )}
    </div>
  );
}

function ProposalCard({
  proposal,
  index,
  isSenator,
}: {
  proposal: Proposal;
  index: number;
  isSenator: boolean;
}) {
  const yesCount = Number(proposal.yesVotes);
  const noCount = Number(proposal.noVotes);
  const totalVotes = yesCount + noCount;
  const yesPercent = totalVotes > 0 ? (yesCount / totalVotes) * 100 : 0;

  const collection = getCollectionByAddress(proposal.nftContract);
  const collectionName = collection?.name ?? truncateAddress(proposal.nftContract);

  return (
    <div className="rounded-xl bg-gray-900 border border-gray-800 p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-1">
            <h3 className="text-lg font-semibold text-white truncate">
              {proposal.title}
            </h3>
            {proposal.executed && (
              <span className="flex-shrink-0 px-2 py-0.5 text-xs font-medium rounded-full bg-purple-500/20 text-purple-300">
                Executed
              </span>
            )}
          </div>
          <p className="text-sm text-gray-500">
            Proposed by{" "}
            <span className="font-mono">
              <ProposerName address={proposal.proposer} />
            </span>
            {" via "}
            <span className="text-gray-400">
              {collectionName} #{Number(proposal.tokenId)}
            </span>
          </p>
          <p className="text-xs text-gray-600 mt-0.5">
            {formatTimestamp(proposal.timestamp)}
          </p>
        </div>
        <span className="flex-shrink-0 text-xs text-gray-600 font-mono">
          #{index}
        </span>
      </div>

      <p className="text-gray-300 text-sm mt-4 whitespace-pre-wrap">
        {proposal.description}
      </p>

      <div className="mt-4 pt-4 border-t border-gray-800">
        <div className="flex items-center justify-between text-sm mb-2">
          <span className="text-green-400 font-medium">
            Yes: {yesCount}
          </span>
          <span className="text-red-400 font-medium">
            No: {noCount}
          </span>
        </div>
        {totalVotes > 0 && (
          <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-green-500 rounded-full transition-all"
              style={{ width: `${yesPercent}%` }}
            />
          </div>
        )}
        {totalVotes === 0 && (
          <div className="w-full h-2 bg-gray-800 rounded-full" />
        )}
        <p className="text-xs text-gray-600 mt-1">
          {totalVotes} vote{totalVotes !== 1 ? "s" : ""} cast
        </p>
      </div>

      {!proposal.executed && (
        <div className="mt-4 pt-4 border-t border-gray-800">
          <VoteButtons proposalIndex={index} isSenator={isSenator} />
          {!isSenator && (
            <p className="text-xs text-gray-600">
              Only senators (Safe owners) can vote on proposals.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export default function ProposalsPage() {
  const { address, isConnected } = useAccount();
  const isSenator = useIsSenator(address);
  const { proposals, isLoading, refetch } = useProposals();

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-3xl font-bold text-white">
          Signaling Proposals
        </h1>
        {proposals.length > 0 && (
          <span className="text-sm text-gray-500">
            {proposals.length} proposal{proposals.length !== 1 ? "s" : ""}
          </span>
        )}
      </div>
      <p className="text-gray-400 mb-8">
        NFT holders from whitelisted collections can create signaling proposals.
        Senators vote to signal the Meta Senate&apos;s position.
      </p>

      {isSenator && (
        <div className="mb-6 p-4 rounded-lg bg-indigo-900/30 border border-indigo-700">
          <p className="text-indigo-300 text-sm">
            You are a Meta Senate senator. You can vote on signaling proposals
            below.
          </p>
        </div>
      )}

      {isConnected && (
        <div className="mb-8">
          <CreateProposalForm onSuccess={refetch} />
        </div>
      )}

      {!isConnected && (
        <div className="mb-8 p-4 rounded-lg bg-gray-900 border border-gray-800 text-center">
          <p className="text-gray-400 text-sm">
            Connect your wallet to create proposals or vote.
          </p>
        </div>
      )}

      {isLoading && (
        <div className="text-center py-16">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-indigo-500 border-r-transparent" />
          <p className="text-gray-500 mt-4">Loading proposals...</p>
        </div>
      )}

      {!isLoading && proposals.length === 0 && (
        <div className="text-center py-16">
          <p className="text-gray-500">No proposals yet.</p>
          <p className="text-gray-600 text-sm mt-2">
            Be the first to create a signaling proposal for the Meta Senate.
          </p>
        </div>
      )}

      {!isLoading && proposals.length > 0 && (
        <div className="space-y-4">
          {[...proposals].reverse().map((proposal, reverseIdx) => {
            const originalIndex = proposals.length - 1 - reverseIdx;
            return (
              <ProposalCard
                key={originalIndex}
                proposal={proposal}
                index={originalIndex}
                isSenator={isSenator}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
