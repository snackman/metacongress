"use client";

import Link from "next/link";
import { SUPPORTED_COLLECTIONS } from "@/lib/constants";
import {
  useCurrentElection,
  useElection,
  useCurrentSenators,
  ElectionPhase,
} from "@/hooks/useElection";

function CommunityCard({
  collection,
}: {
  collection: (typeof SUPPORTED_COLLECTIONS)[number];
}) {
  const { electionAddress } = useCurrentElection(collection.address);
  const { phase, candidates } = useElection(electionAddress);
  const senators = useCurrentSenators(collection.address);

  const phaseName =
    phase === ElectionPhase.Registration
      ? "Registration"
      : phase === ElectionPhase.Voting
      ? "Voting"
      : phase === ElectionPhase.Finalized
      ? "Finalized"
      : "No Election";

  const phaseColor =
    phase === ElectionPhase.Registration
      ? "bg-blue-500/20 text-blue-300"
      : phase === ElectionPhase.Voting
      ? "bg-green-500/20 text-green-300"
      : phase === ElectionPhase.Finalized
      ? "bg-gray-500/20 text-gray-300"
      : "bg-gray-500/20 text-gray-500";

  return (
    <Link href={`/communities/${collection.slug}/election`}>
      <div className="p-6 rounded-xl bg-gray-900 border border-gray-800 hover:border-gray-600 transition-all cursor-pointer">
        <div className="flex items-start justify-between">
          <h3 className="font-semibold text-lg text-white">
            {collection.name}
          </h3>
          <span
            className={`px-2.5 py-0.5 text-xs font-medium rounded-full ${phaseColor}`}
          >
            {phaseName}
          </span>
        </div>
        <p className="text-sm text-gray-500 mt-1 font-mono">
          {collection.address.slice(0, 6)}...{collection.address.slice(-4)}
        </p>
        {candidates.length > 0 && (
          <p className="text-sm text-gray-400 mt-3">
            {candidates.length} candidate{candidates.length !== 1 ? "s" : ""}
          </p>
        )}
        {senators &&
          senators[0] !== "0x0000000000000000000000000000000000000000" && (
            <div className="mt-3 pt-3 border-t border-gray-800">
              <p className="text-xs text-gray-500">Current Senators</p>
              <p className="text-sm text-gray-300 font-mono">
                {senators[0].slice(0, 6)}...{senators[0].slice(-4)}
              </p>
              {senators[1] !==
                "0x0000000000000000000000000000000000000000" && (
                <p className="text-sm text-gray-300 font-mono">
                  {senators[1].slice(0, 6)}...{senators[1].slice(-4)}
                </p>
              )}
            </div>
          )}
      </div>
    </Link>
  );
}

export default function CommunitiesPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-3xl font-bold text-white mb-2">Communities</h1>
      <p className="text-gray-400 mb-8">
        NFT communities participating in MetaSenate governance
      </p>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {SUPPORTED_COLLECTIONS.map((collection) => (
          <CommunityCard key={collection.slug} collection={collection} />
        ))}
      </div>
    </div>
  );
}
