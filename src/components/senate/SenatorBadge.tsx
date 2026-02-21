"use client";

import { useEnsName } from "wagmi";

interface SenatorBadgeProps {
  address: `0x${string}`;
  collectionName?: string;
}

export function SenatorBadge({ address, collectionName }: SenatorBadgeProps) {
  const { data: ensName } = useEnsName({ address });

  return (
    <div className="p-4 rounded-xl bg-gray-900 border border-gray-800 flex items-center gap-4">
      <div className="w-10 h-10 rounded-full bg-indigo-600/30 flex items-center justify-center text-indigo-300 font-bold">
        S
      </div>
      <div>
        <p className="text-white font-mono text-sm">
          {ensName ?? `${address.slice(0, 6)}...${address.slice(-4)}`}
        </p>
        {collectionName && (
          <p className="text-xs text-gray-500">{collectionName}</p>
        )}
      </div>
    </div>
  );
}
