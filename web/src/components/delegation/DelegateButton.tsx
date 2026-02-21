"use client";

import Image from "next/image";
import { useEnsName } from "wagmi";
import { useDelegation } from "@/hooks/useDelegation";

interface DelegateButtonProps {
  tokenAddress: `0x${string}`;
  tokenName: string;
  tokenSymbol: string;
  tokenLogo: string;
}

export function DelegateButton({
  tokenAddress,
  tokenName,
  tokenSymbol,
  tokenLogo,
}: DelegateButtonProps) {
  const {
    balance,
    isDelegatedToSenate,
    senateVotingPower,
    delegateToSenate,
    undelegateFromSenate,
    isPending,
    isConfirming,
    currentDelegate,
  } = useDelegation(tokenAddress);

  const { data: delegateEnsName } = useEnsName({
    address: currentDelegate as `0x${string}` | undefined,
    query: {
      enabled: !!currentDelegate && !isDelegatedToSenate,
    },
  });

  return (
    <div className="p-6 rounded-xl bg-gray-900 border border-gray-800">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gray-800 overflow-hidden flex items-center justify-center">
            <Image
              src={tokenLogo}
              alt={tokenName}
              width={40}
              height={40}
              className="object-contain"
            />
          </div>
          <div>
            <h3 className="font-semibold text-lg text-white">{tokenName}</h3>
            <p className="text-sm text-gray-500">{tokenSymbol}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-400">Your Balance</p>
          <p className="font-mono text-white">
            {Number(balance).toLocaleString(undefined, {
              maximumFractionDigits: 2,
            })}{" "}
            {tokenSymbol}
          </p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
        <div>
          <p className="text-gray-500">Current Delegate</p>
          <p className="text-gray-300 font-mono text-xs">
            {isDelegatedToSenate
              ? "Meta Senate"
              : currentDelegate
              ? delegateEnsName ?? `${currentDelegate.slice(0, 6)}...${currentDelegate.slice(-4)}`
              : "None"}
          </p>
        </div>
        <div>
          <p className="text-gray-500">Senate Voting Power</p>
          <p className="text-gray-300 font-mono">
            {Number(senateVotingPower).toLocaleString(undefined, {
              maximumFractionDigits: 0,
            })}{" "}
            {tokenSymbol}
          </p>
        </div>
      </div>

      <div className="mt-4 flex gap-3">
        {isDelegatedToSenate ? (
          <button
            onClick={undelegateFromSenate}
            disabled={isPending || isConfirming}
            className="w-full py-2.5 rounded-lg font-semibold transition-colors bg-red-900/30 text-red-300 border border-red-800 hover:bg-red-900/50 disabled:opacity-50"
          >
            {isPending
              ? "Confirm in wallet..."
              : isConfirming
              ? "Confirming..."
              : "Undelegate"}
          </button>
        ) : (
          <button
            onClick={delegateToSenate}
            disabled={isPending || isConfirming || Number(balance) === 0}
            className="w-full py-2.5 rounded-lg font-semibold transition-colors bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-700 disabled:text-gray-500"
          >
            {isPending
              ? "Confirm in wallet..."
              : isConfirming
              ? "Confirming..."
              : "Delegate to the Senate"}
          </button>
        )}
      </div>
    </div>
  );
}
