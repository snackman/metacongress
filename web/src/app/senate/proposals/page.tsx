"use client";

import { useAccount } from "wagmi";
import { useIsSenator } from "@/hooks/useSenator";

export default function ProposalsPage() {
  const { address } = useAccount();
  const isSenator = useIsSenator(address);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-3xl font-bold text-white mb-2">DAO Proposals</h1>
      <p className="text-gray-400 mb-8">
        Active proposals from tracked DAO governors. Senators can cast votes on
        behalf of the MetaSenate.
      </p>

      {isSenator && (
        <div className="mb-6 p-4 rounded-lg bg-indigo-900/30 border border-indigo-700">
          <p className="text-indigo-300 text-sm">
            You are a MetaSenate senator. You can propose Safe transactions to
            vote on DAO proposals.
          </p>
        </div>
      )}

      <div className="text-center py-16">
        <p className="text-gray-500">
          Proposal indexing from Governor contracts will appear here.
        </p>
        <p className="text-gray-600 text-sm mt-2">
          Proposals are read from on-chain Governor events via Alchemy.
        </p>
      </div>
    </div>
  );
}
