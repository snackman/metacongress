"use client";

import { useState } from "react";
import Image from "next/image";
import type { ExternalProposal } from "@/lib/types";
import { useEncodeVote } from "@/hooks/useGovernorVote";
import { getChainId } from "@/lib/constants";

function StateBadge({ state }: { state: string }) {
  const config: Record<string, { className: string; label: string }> = {
    active: {
      className: "bg-green-500/20 text-green-300",
      label: "Active",
    },
    pending: {
      className: "bg-yellow-500/20 text-yellow-300",
      label: "Pending",
    },
    succeeded: {
      className: "bg-blue-500/20 text-blue-300",
      label: "Succeeded",
    },
    queued: {
      className: "bg-purple-500/20 text-purple-300",
      label: "Queued",
    },
    executed: {
      className: "bg-gray-500/20 text-gray-300",
      label: "Executed",
    },
    defeated: {
      className: "bg-red-500/20 text-red-300",
      label: "Defeated",
    },
    canceled: {
      className: "bg-gray-500/20 text-gray-400",
      label: "Canceled",
    },
    expired: {
      className: "bg-gray-500/20 text-gray-400",
      label: "Expired",
    },
    closed: {
      className: "bg-gray-500/20 text-gray-300",
      label: "Closed",
    },
  };

  const c = config[state] ?? {
    className: "bg-gray-500/20 text-gray-300",
    label: state,
  };

  return (
    <span
      className={`px-2 py-0.5 text-xs font-medium rounded-full ${c.className}`}
    >
      {c.label}
    </span>
  );
}

function ChainBadge({ chain }: { chain: string }) {
  const names: Record<string, string> = {
    ethereum: "ETH",
    polygon: "MATIC",
    arbitrum: "ARB",
    optimism: "OP",
  };
  return (
    <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-gray-700/50 text-gray-400">
      {names[chain] ?? chain}
    </span>
  );
}

function TimeRemaining({ endTimestamp }: { endTimestamp: number }) {
  const now = Date.now() / 1000;
  const remaining = endTimestamp - now;

  if (remaining <= 0) return <span className="text-gray-500">Ended</span>;

  const days = Math.floor(remaining / 86400);
  const hours = Math.floor((remaining % 86400) / 3600);

  if (days > 0)
    return (
      <span className="text-yellow-400">
        {days}d {hours}h left
      </span>
    );
  const minutes = Math.floor((remaining % 3600) / 60);
  return (
    <span className="text-orange-400">
      {hours}h {minutes}m left
    </span>
  );
}

function VoteTally({
  forVotes,
  againstVotes,
  abstainVotes,
  choices,
  scores,
}: {
  forVotes: string;
  againstVotes: string;
  abstainVotes: string;
  choices?: string[];
  scores?: number[];
}) {
  // Snapshot multi-choice proposals
  if (choices && scores && choices.length > 0) {
    const total = scores.reduce((a, b) => a + b, 0);
    return (
      <div className="space-y-1.5">
        {choices.map((choice, i) => {
          const score = scores[i] ?? 0;
          const pct = total > 0 ? (score / total) * 100 : 0;
          return (
            <div key={i}>
              <div className="flex justify-between text-xs mb-0.5">
                <span className="text-gray-300 truncate max-w-[200px]">
                  {choice}
                </span>
                <span className="text-gray-500">{pct.toFixed(1)}%</span>
              </div>
              <div className="w-full h-1.5 bg-gray-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-indigo-500 rounded-full transition-all"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  // Standard for/against/abstain
  const f = Number(forVotes);
  const a = Number(againstVotes);
  const ab = Number(abstainVotes);
  const total = f + a + ab;
  const forPct = total > 0 ? (f / total) * 100 : 0;
  const againstPct = total > 0 ? (a / total) * 100 : 0;

  return (
    <div>
      <div className="flex items-center justify-between text-xs mb-1.5">
        <span className="text-green-400">For: {f.toLocaleString()}</span>
        <span className="text-red-400">Against: {a.toLocaleString()}</span>
        {ab > 0 && (
          <span className="text-gray-400">Abstain: {ab.toLocaleString()}</span>
        )}
      </div>
      {total > 0 && (
        <div className="w-full h-1.5 bg-gray-800 rounded-full overflow-hidden flex">
          <div
            className="h-full bg-green-500"
            style={{ width: `${forPct}%` }}
          />
          <div
            className="h-full bg-red-500"
            style={{ width: `${againstPct}%` }}
          />
        </div>
      )}
    </div>
  );
}

function SenateVoteButtons({
  proposal,
}: {
  proposal: ExternalProposal;
}) {
  const { encodeVote, isLoading, error, result } = useEncodeVote();
  const [voteChoice, setVoteChoice] = useState<number | null>(null);

  if (proposal.senateHasVoted) {
    return (
      <p className="text-sm text-indigo-400 font-medium">
        Senate has already voted
      </p>
    );
  }

  if (proposal.governanceType === "snapshot") {
    return (
      <a
        href={proposal.externalUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-block px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-sm font-medium transition-colors text-white"
      >
        Vote on Snapshot
      </a>
    );
  }

  if (result) {
    return (
      <div className="space-y-2">
        <p className="text-green-400 text-sm font-medium">
          Vote transaction encoded
        </p>
        <p className="text-xs text-gray-500">
          Submit this transaction through the Senate Safe to cast the vote.
        </p>
        <div className="p-3 rounded-lg bg-gray-800 border border-gray-700">
          <p className="text-xs text-gray-400 mb-1">To: {result.to}</p>
          <p className="text-xs text-gray-400 font-mono break-all">
            Data: {result.data.slice(0, 66)}...
          </p>
        </div>
        <a
          href={`https://app.safe.global/transactions/queue?safe=eth:${process.env.NEXT_PUBLIC_SENATE_SAFE_ADDRESS}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block text-xs text-indigo-400 hover:text-indigo-300"
        >
          Open Safe App to submit
        </a>
      </div>
    );
  }

  const chainId = getChainId(proposal.chain);

  async function handleVote(support: number) {
    setVoteChoice(support);
    await encodeVote({
      governorAddress: proposal.governorAddress,
      proposalId: proposal.proposalId,
      support,
      reason: "Vote cast by Meta Senate",
      governorType: proposal.governorType ?? "ozGovernor",
      chainId,
    });
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <button
          onClick={() => handleVote(1)}
          disabled={isLoading}
          className="flex-1 px-3 py-1.5 bg-green-700 hover:bg-green-600 disabled:bg-green-900 disabled:cursor-not-allowed rounded-lg text-sm font-medium transition-colors text-white"
        >
          {isLoading && voteChoice === 1 ? "..." : "For"}
        </button>
        <button
          onClick={() => handleVote(0)}
          disabled={isLoading}
          className="flex-1 px-3 py-1.5 bg-red-700 hover:bg-red-600 disabled:bg-red-900 disabled:cursor-not-allowed rounded-lg text-sm font-medium transition-colors text-white"
        >
          {isLoading && voteChoice === 0 ? "..." : "Against"}
        </button>
        <button
          onClick={() => handleVote(2)}
          disabled={isLoading}
          className="flex-1 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:cursor-not-allowed rounded-lg text-sm font-medium transition-colors text-white"
        >
          {isLoading && voteChoice === 2 ? "..." : "Abstain"}
        </button>
      </div>
      {error && <p className="text-red-400 text-xs">{error}</p>}
    </div>
  );
}

export function ExternalProposalCard({
  proposal,
  isSenator,
}: {
  proposal: ExternalProposal;
  isSenator: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const isActive = proposal.state === "active";

  const descriptionPreview =
    proposal.description.length > 200
      ? proposal.description.slice(0, 200) + "..."
      : proposal.description;

  return (
    <div
      className={`rounded-xl bg-gray-900 border ${
        isActive ? "border-green-800/50" : "border-gray-800"
      } p-6`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <Image
            src={proposal.daoLogo}
            alt={proposal.daoName}
            width={32}
            height={32}
            className="rounded-full flex-shrink-0"
          />
          <div className="min-w-0">
            <h3 className="text-base font-semibold text-white truncate">
              {proposal.title}
            </h3>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs text-gray-500">{proposal.daoName}</span>
              <ChainBadge chain={proposal.chain} />
              <StateBadge state={proposal.state} />
            </div>
          </div>
        </div>
        {proposal.endTimestamp && (
          <div className="flex-shrink-0 text-xs">
            <TimeRemaining endTimestamp={proposal.endTimestamp} />
          </div>
        )}
      </div>

      {/* Description */}
      <div className="mt-3">
        <p className="text-gray-400 text-sm whitespace-pre-wrap">
          {expanded ? proposal.description : descriptionPreview}
        </p>
        {proposal.description.length > 200 && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-indigo-400 hover:text-indigo-300 text-xs mt-1"
          >
            {expanded ? "Show less" : "Read more"}
          </button>
        )}
      </div>

      {/* Proposer */}
      <p className="text-xs text-gray-600 mt-2">
        Proposed by{" "}
        <span className="font-mono">
          {proposal.proposer.slice(0, 6)}...{proposal.proposer.slice(-4)}
        </span>
      </p>

      {/* Vote tally */}
      <div className="mt-4 pt-4 border-t border-gray-800">
        <VoteTally
          forVotes={proposal.forVotes}
          againstVotes={proposal.againstVotes}
          abstainVotes={proposal.abstainVotes}
          choices={proposal.choices}
          scores={proposal.scores}
        />
      </div>

      {/* Senate voting power */}
      {proposal.senateVotingPower && (
        <p className="text-xs text-gray-500 mt-2">
          Senate voting power:{" "}
          <span className="text-white font-medium">
            {Number(proposal.senateVotingPower).toLocaleString()}{" "}
            {proposal.daoSymbol}
          </span>
        </p>
      )}

      {/* Actions */}
      <div className="mt-4 pt-4 border-t border-gray-800 flex items-center justify-between gap-4">
        <div className="flex-1">
          {isActive && isSenator && (
            <SenateVoteButtons proposal={proposal} />
          )}
          {isActive && !isSenator && (
            <p className="text-xs text-gray-600">
              Only senators can vote on DAO proposals.
            </p>
          )}
          {!isActive && (
            <p className="text-xs text-gray-600">
              Voting {proposal.state === "pending" ? "has not started" : "has ended"}.
            </p>
          )}
        </div>
        <a
          href={proposal.externalUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-shrink-0 px-3 py-1.5 border border-gray-700 hover:border-gray-500 rounded-lg text-xs text-gray-400 hover:text-white transition-colors"
        >
          View on {proposal.governanceType === "snapshot" ? "Snapshot" : "Tally"}
        </a>
      </div>
    </div>
  );
}
