"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useAccount } from "wagmi";
import { getCollectionBySlug, getCryptoPunksImageUrl } from "@/lib/constants";
import { getNFTMetadata } from "@/lib/alchemy";
import {
  useAllocationAddress,
  useAllocation,
  type AllocationCandidate,
} from "@/hooks/useAllocation";
import { useIsSenator } from "@/hooks/useSenator";
import { useCollectionMetadata } from "@/hooks/useCollectionMetadata";
import { CandidateCard } from "@/components/election/CandidateCard";
import { DeclareCandidacyAllocation } from "@/components/allocation/DeclareCandidacyAllocation";
import { AllocationBooth } from "@/components/allocation/AllocationBooth";
import { EditCollectionModal } from "@/components/EditCollectionModal";

function useNftImage(contractAddress: string, tokenId: bigint) {
  const { data } = useQuery({
    queryKey: ["nft-image", contractAddress, tokenId.toString()],
    queryFn: async () => {
      const meta = await getNFTMetadata(contractAddress, tokenId.toString());
      const rawImage = (meta.raw?.metadata as Record<string, string> | undefined)?.image;
      return (
        meta.image?.thumbnailUrl ??
        meta.image?.cachedUrl ??
        meta.image?.pngUrl ??
        meta.image?.originalUrl ??
        rawImage ??
        getCryptoPunksImageUrl(contractAddress, tokenId.toString()) ??
        null
      );
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
}: {
  candidate: AllocationCandidate;
  index: number;
  collectionAddress: string;
  isWinner?: boolean;
}) {
  const nftImageUrl = useNftImage(collectionAddress, candidate.nftTokenId);
  return (
    <CandidateCard
      candidate={candidate}
      index={index}
      isWinner={isWinner}
      nftImageUrl={nftImageUrl}
    />
  );
}

function AllocationContent({
  collectionAddress,
}: {
  collectionAddress: `0x${string}`;
}) {
  const { allocationAddress, isLoading: addressLoading } =
    useAllocationAddress(collectionAddress);
  const { candidates, totalVotes, currentSenators, isLoading } =
    useAllocation(allocationAddress);

  if (addressLoading || isLoading) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-400">Loading allocation data...</p>
      </div>
    );
  }

  if (!allocationAddress) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-400">
          No vote allocation contract for this community yet.
        </p>
      </div>
    );
  }

  const sortedCandidates = candidates
    .slice()
    .sort((a, b) => Number(b.voteCount - a.voteCount));

  const isSenator = (wallet: string) =>
    currentSenators[0].toLowerCase() === wallet.toLowerCase() ||
    currentSenators[1].toLowerCase() === wallet.toLowerCase();

  return (
    <div className="space-y-8">
      {/* Status bar */}
      <div className="flex items-center gap-4">
        <span className="px-3 py-1 text-sm font-medium rounded-full bg-green-500/20 text-green-300">
          Live
        </span>
        <span className="text-sm text-gray-400">
          {Number(totalVotes)} total votes
        </span>
      </div>

      {/* Current Senators */}
      {currentSenators[0] !==
        "0x0000000000000000000000000000000000000000" && (
        <div className="p-4 rounded-xl bg-indigo-900/20 border border-indigo-800">
          <h3 className="text-sm font-semibold text-indigo-300 mb-3">
            Current Senators
          </h3>
          <div className="grid grid-cols-2 gap-4">
            {currentSenators.map((addr, i) => {
              if (addr === "0x0000000000000000000000000000000000000000")
                return null;
              const candidate = candidates.find(
                (c) => c.wallet.toLowerCase() === addr.toLowerCase()
              );
              return (
                <div
                  key={i}
                  className="flex items-center gap-3 p-3 rounded-lg bg-indigo-900/30"
                >
                  <span className="w-8 h-8 flex items-center justify-center rounded-full bg-indigo-600 text-white text-sm font-bold">
                    S
                  </span>
                  <div>
                    <p className="text-white font-medium">
                      {candidate?.name ?? `${addr.slice(0, 6)}...${addr.slice(-4)}`}
                    </p>
                    {candidate && (
                      <p className="text-xs text-gray-400">
                        {Number(candidate.voteCount)} votes
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Left column: Candidacy + Voting */}
        <div className="space-y-8">
          <DeclareCandidacyAllocation
            allocationAddress={allocationAddress}
            nftContractAddress={collectionAddress}
          />

          <AllocationBooth
            allocationAddress={allocationAddress}
            candidates={candidates}
            collectionAddress={collectionAddress}
          />
        </div>

        {/* Right column: Leaderboard */}
        <div>
          <h3 className="text-lg font-semibold text-white mb-4">
            Candidate Leaderboard
          </h3>
          {sortedCandidates.length === 0 ? (
            <p className="text-gray-500 text-sm">
              No candidates yet. Be the first to declare!
            </p>
          ) : (
            <div className="space-y-4">
              {sortedCandidates.map((candidate) => {
                const originalIndex = candidates.indexOf(candidate);
                return (
                  <CandidateWithImage
                    key={originalIndex}
                    candidate={candidate}
                    index={originalIndex}
                    collectionAddress={collectionAddress}
                    isWinner={isSenator(candidate.wallet)}
                  />
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AllocationPage() {
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
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
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
        <p className="text-gray-300 text-sm mb-4">{metadata.description}</p>
      )}
      <p className="text-gray-400 mb-8">
        Ongoing vote allocation — the top 2 candidates are the current senators.
        Allocate or change your vote at any time.
      </p>
      <AllocationContent collectionAddress={collection.address} />

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
