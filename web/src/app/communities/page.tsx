"use client";

import Link from "next/link";
import Image from "next/image";
import { useQuery } from "@tanstack/react-query";
import { SUPPORTED_COLLECTIONS } from "@/lib/constants";
import { getNFTMetadata } from "@/lib/alchemy";
import {
  useCurrentElection,
  useElection,
  useCurrentSenators,
  ElectionPhase,
} from "@/hooks/useElection";
import {
  useAllocationAddress,
  useAllocation,
} from "@/hooks/useAllocation";
import { useNominations, Nomination } from "@/hooks/useNominations";
import { AddressDisplay } from "@/components/AddressDisplay";

function NftThumbnail({
  contractAddress,
  tokenId,
}: {
  contractAddress: string;
  tokenId: bigint;
}) {
  const { data: imageUrl } = useQuery({
    queryKey: ["nft-image", contractAddress, tokenId.toString()],
    queryFn: async () => {
      const meta = await getNFTMetadata(contractAddress, tokenId.toString());
      return (
        meta.image?.thumbnailUrl ??
        meta.image?.cachedUrl ??
        meta.image?.originalUrl ??
        null
      );
    },
    staleTime: 5 * 60_000,
  });

  if (!imageUrl) {
    return (
      <div className="w-full aspect-square rounded bg-gray-800" />
    );
  }

  return (
    <img
      src={imageUrl}
      alt={`#${tokenId.toString()}`}
      className="w-full aspect-square rounded object-cover"
    />
  );
}

function CommunityCard({
  collection,
}: {
  collection: (typeof SUPPORTED_COLLECTIONS)[number];
}) {
  const { allocationAddress } = useAllocationAddress(collection.address);
  const { candidates: allocationCandidates } = useAllocation(allocationAddress);
  const { electionAddress } = useCurrentElection(collection.address);
  const { phase, candidates } = useElection(electionAddress);
  const senators = useCurrentSenators(collection.address);

  const hasAllocation = !!allocationAddress;

  const phaseName = hasAllocation
    ? "Live"
    : phase === ElectionPhase.Registration
    ? "Registration"
    : phase === ElectionPhase.Voting
    ? "Voting"
    : phase === ElectionPhase.Finalized
    ? "Finalized"
    : "No Election";

  const phaseColor = hasAllocation
    ? "bg-green-500/20 text-green-300"
    : phase === ElectionPhase.Registration
    ? "bg-blue-500/20 text-blue-300"
    : phase === ElectionPhase.Voting
    ? "bg-green-500/20 text-green-300"
    : phase === ElectionPhase.Finalized
    ? "bg-gray-500/20 text-gray-300"
    : "bg-gray-500/20 text-gray-500";

  const href = hasAllocation
    ? `/communities/${collection.slug}/allocation`
    : `/communities/${collection.slug}/election`;

  // Top 8 candidates by vote count for NFT thumbnails
  const topCandidates = allocationCandidates
    .slice()
    .sort((a, b) => Number(b.voteCount - a.voteCount))
    .slice(0, 8);

  return (
    <Link href={href}>
      <div className="p-6 rounded-xl bg-gray-900 border border-gray-800 hover:border-gray-600 transition-all cursor-pointer">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <Image
              src={collection.logo}
              alt={collection.name}
              width={36}
              height={36}
              className="rounded-full"
            />
            <h3 className="font-semibold text-lg text-white">
              {collection.name}
            </h3>
          </div>
          <span
            className={`px-2.5 py-0.5 text-xs font-medium rounded-full ${phaseColor}`}
          >
            {phaseName}
          </span>
        </div>
        <p className="text-sm text-gray-500 mt-1 font-mono">
          {collection.address.slice(0, 6)}...{collection.address.slice(-4)}
        </p>
        {topCandidates.length > 0 && (
          <div className="mt-3">
            <p className="text-xs text-gray-500 mb-2">
              {allocationCandidates.length} candidate
              {allocationCandidates.length !== 1 ? "s" : ""}
            </p>
            <div className="grid grid-cols-4 gap-1.5">
              {topCandidates.map((candidate, i) => (
                <NftThumbnail
                  key={i}
                  contractAddress={collection.address}
                  tokenId={candidate.nftTokenId}
                />
              ))}
            </div>
          </div>
        )}
        {topCandidates.length === 0 && candidates.length > 0 && (
          <p className="text-sm text-gray-400 mt-3">
            {candidates.length} candidate{candidates.length !== 1 ? "s" : ""}
          </p>
        )}
        {senators &&
          senators[0] !== "0x0000000000000000000000000000000000000000" && (
            <div className="mt-3 pt-3 border-t border-gray-800">
              <p className="text-xs text-gray-500">Current Senators</p>
              <p className="text-sm text-gray-300 font-mono">
                <AddressDisplay address={senators[0] as `0x${string}`} />
              </p>
              {senators[1] !==
                "0x0000000000000000000000000000000000000000" && (
                <p className="text-sm text-gray-300 font-mono">
                  <AddressDisplay address={senators[1] as `0x${string}`} />
                </p>
              )}
            </div>
          )}
      </div>
    </Link>
  );
}

function NominatedCommunityCard({ nomination }: { nomination: Nomination }) {
  return (
    <div className="p-6 rounded-xl bg-gray-900 border border-gray-800 border-dashed">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-yellow-500/20 flex items-center justify-center text-yellow-300 text-sm font-bold">
            ?
          </div>
          <h3 className="font-semibold text-lg text-white">
            {nomination.name}
          </h3>
        </div>
        <span className="px-2.5 py-0.5 text-xs font-medium rounded-full bg-yellow-500/20 text-yellow-300">
          Nominated
        </span>
      </div>
      <p className="text-sm text-gray-500 mt-1 font-mono">
        {nomination.nftContract.slice(0, 6)}...
        {nomination.nftContract.slice(-4)}
      </p>
      {nomination.reason && (
        <p className="text-sm text-gray-400 mt-3 line-clamp-2">
          {nomination.reason}
        </p>
      )}
      <div className="mt-3 pt-3 border-t border-gray-800">
        <p className="text-xs text-gray-500">
          Nominated by{" "}
          <AddressDisplay address={nomination.nominator} /> on{" "}
          {new Date(Number(nomination.timestamp) * 1000).toLocaleDateString()}
        </p>
      </div>
    </div>
  );
}

export default function CommunitiesPage() {
  const { nominations, isLoading: nominationsLoading } = useNominations();

  // Filter out nominations that are already in SUPPORTED_COLLECTIONS
  const whitelistedAddresses = new Set(
    SUPPORTED_COLLECTIONS.map((c) => c.address.toLowerCase())
  );
  const pendingNominations = nominations.filter(
    (nom) => !whitelistedAddresses.has(nom.nftContract.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Communities</h1>
          <p className="text-gray-400">
            NFT communities participating in Meta Senate governance
          </p>
        </div>
        <Link
          href="/nominate"
          className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 rounded-lg font-semibold text-sm transition-colors"
        >
          Nominate a Community
        </Link>
      </div>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {SUPPORTED_COLLECTIONS.map((collection) => (
          <CommunityCard key={collection.slug} collection={collection} />
        ))}
      </div>

      {/* Nominated Communities Section */}
      {!nominationsLoading && pendingNominations.length > 0 && (
        <div className="mt-12">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-white mb-1">
              Nominated Communities
            </h2>
            <p className="text-gray-400 text-sm">
              NFT communities nominated for inclusion in the Meta Senate.
              Pending review and approval.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {pendingNominations.map((nomination, i) => (
              <NominatedCommunityCard
                key={`${nomination.nftContract}-${i}`}
                nomination={nomination}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
