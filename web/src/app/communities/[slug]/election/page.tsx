"use client";

import { useParams } from "next/navigation";
import { getCollectionBySlug } from "@/lib/constants";
import {
  useCurrentElection,
  useElection,
  ElectionPhase,
} from "@/hooks/useElection";
import { useFinalizeElection } from "@/hooks/useVote";
import { CandidateCard } from "@/components/election/CandidateCard";
import { DeclareCandidacy } from "@/components/election/DeclareCandidacy";
import { VotingBooth } from "@/components/election/VotingBooth";

function ElectionContent({
  collectionAddress,
}: {
  collectionAddress: `0x${string}`;
}) {
  const { electionAddress } = useCurrentElection(collectionAddress);
  const { phase, candidates, votingEndTime, winners, isLoading } =
    useElection(electionAddress);
  const { finalize, isPending: finalizePending } = useFinalizeElection(
    electionAddress ?? "0x0000000000000000000000000000000000000000"
  );

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-400">Loading election data...</p>
      </div>
    );
  }

  if (!electionAddress || electionAddress === "0x0000000000000000000000000000000000000000") {
    return (
      <div className="text-center py-12">
        <p className="text-gray-400">
          No active election for this community yet.
        </p>
      </div>
    );
  }

  const votingEnded =
    votingEndTime && votingEndTime * 1000 < Date.now();

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <span
          className={`px-3 py-1 text-sm font-medium rounded-full ${
            phase === ElectionPhase.Registration
              ? "bg-blue-500/20 text-blue-300"
              : phase === ElectionPhase.Voting
              ? "bg-green-500/20 text-green-300"
              : "bg-gray-500/20 text-gray-300"
          }`}
        >
          {phase === ElectionPhase.Registration
            ? "Registration Open"
            : phase === ElectionPhase.Voting
            ? "Voting Active"
            : "Election Finalized"}
        </span>
        {votingEndTime && phase === ElectionPhase.Voting && (
          <span className="text-sm text-gray-400">
            {votingEnded
              ? "Voting period ended"
              : `Voting ends ${new Date(
                  votingEndTime * 1000
                ).toLocaleDateString()}`}
          </span>
        )}
      </div>

      {/* Registration Phase */}
      {phase === ElectionPhase.Registration && (
        <>
          <DeclareCandidacy
            electionAddress={electionAddress}
            nftContractAddress={collectionAddress}
          />
          {candidates.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-white mb-4">
                Declared Candidates ({candidates.length}/3 needed to start
                voting)
              </h3>
              <div className="space-y-4">
                {candidates.map((c, i) => (
                  <CandidateCard key={i} candidate={c} index={i} />
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Voting Phase */}
      {phase === ElectionPhase.Voting && (
        <>
          <VotingBooth
            electionAddress={electionAddress}
            nftContractAddress={collectionAddress}
            candidates={candidates}
            votingEndTime={votingEndTime!}
          />
          {votingEnded && (
            <button
              onClick={() => finalize()}
              disabled={finalizePending}
              className="w-full py-3 bg-yellow-600 hover:bg-yellow-500 disabled:bg-gray-700 rounded-lg font-semibold transition-colors"
            >
              {finalizePending
                ? "Finalizing..."
                : "Finalize Election"}
            </button>
          )}
        </>
      )}

      {/* Finalized Phase */}
      {phase === ElectionPhase.Finalized && (
        <div className="space-y-6">
          <h3 className="text-lg font-semibold text-white">
            Election Results
          </h3>
          <div className="space-y-4">
            {candidates
              .slice()
              .sort((a, b) => Number(b.voteCount - a.voteCount))
              .map((c, i) => (
                <CandidateCard
                  key={i}
                  candidate={c}
                  index={i}
                  isWinner={
                    winners?.[0] === c.wallet || winners?.[1] === c.wallet
                  }
                />
              ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function ElectionPage() {
  const params = useParams();
  const slug = params.slug as string;
  const collection = getCollectionBySlug(slug);

  if (!collection) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 text-center">
        <p className="text-gray-400">Community not found</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-3xl font-bold text-white mb-2">{collection.name}</h1>
      <p className="text-gray-500 font-mono text-sm mb-8">
        {collection.address}
      </p>
      <ElectionContent collectionAddress={collection.address} />
    </div>
  );
}
