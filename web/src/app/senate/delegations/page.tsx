"use client";

import { DAO_TOKENS } from "@/lib/constants";
import { VotingPowerCard } from "@/components/senate/VotingPowerCard";
import { SENATE_SAFE_ADDRESS } from "@/lib/contracts";

export default function DelegationsPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-3xl font-bold text-white mb-2">
        Delegation Overview
      </h1>
      <p className="text-gray-400 mb-2">
        Total voting power delegated to the MetaSenate Safe.
      </p>
      <p className="text-gray-500 font-mono text-sm mb-8">
        Safe: {SENATE_SAFE_ADDRESS}
      </p>

      <div className="grid sm:grid-cols-2 gap-4">
        {DAO_TOKENS.map((token) => (
          <VotingPowerCard
            key={token.address}
            tokenAddress={token.address}
            tokenName={token.name}
            tokenSymbol={token.symbol}
          />
        ))}
      </div>

      <div className="mt-8 p-4 rounded-lg bg-gray-900/50 border border-gray-800">
        <h3 className="font-semibold text-white mb-2">
          Re-delegation
        </h3>
        <p className="text-sm text-gray-400">
          Senators can propose re-delegation of voting power through the
          MetaSenate Safe multisig. This requires co-signing from a majority of
          active senators.
        </p>
      </div>
    </div>
  );
}
