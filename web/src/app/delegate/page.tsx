"use client";

import { DAO_TOKENS } from "@/lib/constants";
import { DelegateButton } from "@/components/delegation/DelegateButton";

export default function DelegatePage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-3xl font-bold text-white mb-2">Delegate Tokens</h1>
      <p className="text-gray-400 mb-8">
        Delegate your DAO governance tokens to the MetaSenate. Your tokens stay
        in your wallet — only voting power is delegated. Senators vote on
        proposals on your behalf.
      </p>

      <div className="space-y-4">
        {DAO_TOKENS.map((token) => (
          <DelegateButton
            key={token.address}
            tokenAddress={token.address}
            tokenName={token.name}
            tokenSymbol={token.symbol}
          />
        ))}
      </div>

      <div className="mt-8 p-4 rounded-lg bg-gray-900/50 border border-gray-800">
        <h3 className="font-semibold text-white mb-2">How Delegation Works</h3>
        <ul className="text-sm text-gray-400 space-y-1">
          <li>
            - Your tokens remain in your wallet at all times
          </li>
          <li>
            - Only voting power (not tokens) is delegated to the MetaSenate Safe
          </li>
          <li>
            - You can re-delegate or self-delegate at any time
          </li>
          <li>
            - Elected senators use this voting power on DAO proposals
          </li>
        </ul>
      </div>
    </div>
  );
}
