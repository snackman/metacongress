"use client";

import Link from "next/link";
import { SUPPORTED_COLLECTIONS, DAO_TOKENS } from "@/lib/constants";
import { useCurrentSenators } from "@/hooks/useElection";
import { useSafeOwners } from "@/hooks/useSenator";
import { SenatorBadge } from "@/components/senate/SenatorBadge";
import { VotingPowerCard } from "@/components/senate/VotingPowerCard";

function CommunitySenators({
  collection,
}: {
  collection: (typeof SUPPORTED_COLLECTIONS)[number];
}) {
  const senators = useCurrentSenators(collection.address);

  if (
    !senators ||
    senators[0] === "0x0000000000000000000000000000000000000000"
  ) {
    return null;
  }

  return (
    <div className="space-y-2">
      <h3 className="text-sm text-gray-500">{collection.name}</h3>
      <SenatorBadge address={senators[0]} collectionName={collection.name} />
      {senators[1] !== "0x0000000000000000000000000000000000000000" && (
        <SenatorBadge address={senators[1]} collectionName={collection.name} />
      )}
    </div>
  );
}

export default function SenatePage() {
  const safeOwners = useSafeOwners();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white">Senate Dashboard</h1>
          <p className="text-gray-400 mt-1">
            {safeOwners.length} active senator
            {safeOwners.length !== 1 ? "s" : ""} across all communities
          </p>
        </div>
        <Link
          href="/senate/proposals"
          className="px-4 py-2 border border-gray-700 hover:border-gray-500 rounded-lg text-sm transition-colors"
        >
          Proposals
        </Link>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        <div>
          <h2 className="text-xl font-semibold text-white mb-4">
            Voting Power
          </h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {DAO_TOKENS.map((token) => (
              <VotingPowerCard
                key={token.address}
                tokenAddress={token.address}
                tokenName={token.name}
                tokenSymbol={token.symbol}
                chain={token.chain}
              />
            ))}
          </div>
        </div>

        <div>
          <h2 className="text-xl font-semibold text-white mb-4">
            Elected Senators
          </h2>
          <div className="space-y-6">
            {SUPPORTED_COLLECTIONS.map((collection) => (
              <CommunitySenators
                key={collection.slug}
                collection={collection}
              />
            ))}
          </div>
          {safeOwners.length === 0 && (
            <p className="text-gray-500 text-sm">
              No senators elected yet. Elections must be finalized first.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
