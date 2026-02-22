"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useAccount } from "wagmi";
import { getCollectionBySlug } from "@/lib/constants";
import { getNFTMetadata } from "@/lib/alchemy";
import {
  useCurrentElection,
  useElection,
  ElectionPhase,
  type Candidate,
} from "@/hooks/useElection";
import { useFinalizeElection, useOpenVoting } from "@/hooks/useVote";
import { useIsSenator } from "@/hooks/useSenator";
import { useCollectionMetadata } from "@/hooks/useCollectionMetadata";
import { CandidateCard } from "@/components/election/CandidateCard";
import { DeclareCandidacy } from "@/components/election/DeclareCandidacy";
import { VotingBooth } from "@/components/election/VotingBooth";
import { VotingBoothV3 } from "@/components/election/VotingBoothV3";
import { VoterRegistration } from "@/components/election/VoterRegistration";
import { EditCollectionModal } from "@/components/EditCollectionModal";

function useNftImage(contractAddress: string, tokenId: bigint) {
  const { data } = useQuery({
    queryKey: ["nft-image", contractAddress, tokenId.toString()],
    queryFn: async () => {
      const meta = await getNFTMetadata(contractAddress, tokenId.toString());
      const rawImage = (meta.raw?.metadata as Record<string, string> | undefined)?.image;
      return meta.image?.thumbnailUrl ?? meta.image?.cachedUrl ?? meta.image?.pngUrl ?? meta.image?.originalUrl ?? rawImage ?? null;
    },
    staleTime: 5 * 60_000,
  });
  return data ?? undefined;
}

function CandidateWithImage({
  candidate,
  index,
  collectionAddress,
  isWinner,
  selected,
  onSelect,
  selectable,
}: {
  candidate: Candidate;
  index: number;
  collectionAddress: string;
  isWinner?: boolean;
  selected?: boolean;
  onSelect?: (index: number) => void;
  selectable?: boolean;
}) {
  const nftImageUrl = useNftImage(collectionAddress, candidate.nftTokenId);
  return (
    <CandidateCard
      candidate={candidate}
      index={index}
      isWinner={isWinner}
      selected={selected}
      onSelect={onSelect}
      selectable={selectable}
      nftImageUrl={nftImageUrl}
    />
  );
}

function PhaseBadge({ phase, isV3 }: { phase: ElectionPhase; isV3?: boolean }) {
  const config = {
    [ElectionPhase.Registration]: {
      label: isV3 ? "Registration / Commitment Collection" : "Registration Open",
      className: "bg-blue-500/20 text-blue-300",
    },
    [ElectionPhase.VoterRegistration]: {
      label: "Voter Registration",
      className: "bg-purple-500/20 text-purple-300",
    },
    [ElectionPhase.Voting]: {
      label: "Voting Active",
      className: "bg-green-500/20 text-green-300",
    },
    [ElectionPhase.Finalized]: {
      label: "Election Finalized",
      className: "bg-gray-500/20 text-gray-300",
    },
  }[phase];

  return (
    <span className={`px-3 py-1 text-sm font-medium rounded-full ${config.className}`}>
      {config.label}
    </span>
  );
}

function ElectionContent({
  collectionAddress,
}: {
  collectionAddress: `0x${string}`;
}) {
  const { electionAddress } = useCurrentElection(collectionAddress);
  const {
    phase,
    candidates,
    votingEndTime,
    winners,
    voterRegistrationEndTime,
    groupId,
    isLoading,
    electionVersion,
    commitmentDeadline,
  } = useElection(electionAddress);
  const { finalize, isPending: finalizePending } = useFinalizeElection(
    electionAddress ?? "0x0000000000000000000000000000000000000000"
  );
  const { openVoting, isPending: openVotingPending } = useOpenVoting(
    electionAddress ?? "0x0000000000000000000000000000000000000000"
  );

  const isV3 = electionVersion === 3;

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

  const votingEnded = votingEndTime && votingEndTime * 1000 < Date.now();
  const registrationEnded =
    voterRegistrationEndTime && voterRegistrationEndTime * 1000 < Date.now();
  const commitmentDeadlinePassed =
    commitmentDeadline && commitmentDeadline * 1000 < Date.now();

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        {phase !== undefined && <PhaseBadge phase={phase} isV3={isV3} />}
        {/* V2: Show voter registration deadline */}
        {!isV3 &&
          voterRegistrationEndTime &&
          phase === ElectionPhase.VoterRegistration && (
            <span className="text-sm text-gray-400">
              {registrationEnded
                ? "Registration period ended"
                : `Registration ends ${new Date(
                    voterRegistrationEndTime * 1000
                  ).toLocaleDateString()}`}
            </span>
          )}
        {/* V3: Show commitment deadline during registration */}
        {isV3 &&
          commitmentDeadline &&
          phase === ElectionPhase.Registration && (
            <span className="text-sm text-gray-400">
              {commitmentDeadlinePassed
                ? "Commitment collection ended — awaiting voting"
                : `Commitments due by ${new Date(
                    commitmentDeadline * 1000
                  ).toLocaleDateString()}`}
            </span>
          )}
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

      {/* Registration Phase — Candidates declare */}
      {phase === ElectionPhase.Registration && (
        <>
          <DeclareCandidacy
            electionAddress={electionAddress}
            nftContractAddress={collectionAddress}
          />
          {candidates.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-white mb-4">
                Declared Candidates ({candidates.length})
              </h3>
              <div className="space-y-4">
                {candidates.map((c, i) => (
                  <CandidateWithImage key={i} candidate={c} index={i} collectionAddress={collectionAddress} />
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* V2 only: Voter Registration Phase */}
      {!isV3 && phase === ElectionPhase.VoterRegistration && (
        <>
          <VoterRegistration
            electionAddress={electionAddress}
            nftContractAddress={collectionAddress}
            voterRegistrationEndTime={voterRegistrationEndTime!}
          />

          {candidates.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-white mb-4">
                Candidates
              </h3>
              <div className="space-y-4">
                {candidates.map((c, i) => (
                  <CandidateWithImage key={i} candidate={c} index={i} collectionAddress={collectionAddress} />
                ))}
              </div>
            </div>
          )}

          {registrationEnded && (
            <button
              onClick={() => openVoting()}
              disabled={openVotingPending}
              className="w-full py-3 bg-purple-600 hover:bg-purple-500 disabled:bg-gray-700 rounded-lg font-semibold transition-colors"
            >
              {openVotingPending ? "Opening voting..." : "Open Voting Phase"}
            </button>
          )}
        </>
      )}

      {/* Voting Phase */}
      {phase === ElectionPhase.Voting && (
        <>
          {isV3 ? (
            <VotingBoothV3
              electionAddress={electionAddress}
              candidates={candidates}
              votingEndTime={votingEndTime!}
              collectionAddress={collectionAddress}
            />
          ) : (
            <VotingBooth
              electionAddress={electionAddress}
              candidates={candidates}
              votingEndTime={votingEndTime!}
              groupId={groupId}
              collectionAddress={collectionAddress}
            />
          )}
          {votingEnded && (
            <button
              onClick={() => finalize()}
              disabled={finalizePending}
              className="w-full py-3 bg-yellow-600 hover:bg-yellow-500 disabled:bg-gray-700 rounded-lg font-semibold transition-colors"
            >
              {finalizePending ? "Finalizing..." : "Finalize Election"}
            </button>
          )}
        </>
      )}

      {/* Finalized Phase — Results */}
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
                <CandidateWithImage
                  key={i}
                  candidate={c}
                  index={i}
                  collectionAddress={collectionAddress}
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
  const { address: walletAddress } = useAccount();
  const isSenator = useIsSenator(walletAddress as `0x${string}` | undefined);
  const { metadata } = useCollectionMetadata(collection?.address);
  const [showEditModal, setShowEditModal] = useState(false);

  if (!collection) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 text-center">
        <p className="text-gray-400">Community not found</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="flex items-start justify-between mb-2">
        <h1 className="text-3xl font-bold text-white">{collection.name}</h1>
        {isSenator && (
          <button
            onClick={() => setShowEditModal(true)}
            className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg text-sm text-gray-300 hover:text-white transition-colors"
          >
            Edit Community
          </button>
        )}
      </div>
      {metadata.description && (
        <p className="text-gray-300 text-sm mb-2">{metadata.description}</p>
      )}
      <p className="text-gray-500 font-mono text-sm mb-8">
        {collection.address}
      </p>
      <ElectionContent collectionAddress={collection.address} />

      {showEditModal && (
        <EditCollectionModal
          collectionAddress={collection.address}
          currentLogoUrl={metadata.logoUrl}
          currentDescription={metadata.description}
          onClose={() => setShowEditModal(false)}
          onSaved={() => {}}
        />
      )}
    </div>
  );
}
