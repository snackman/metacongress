"use client";

import { useDelegation } from "@/hooks/useDelegation";

interface DelegateButtonProps {
  tokenAddress: `0x${string}`;
  tokenName: string;
  tokenSymbol: string;
}

export function DelegateButton({
  tokenAddress,
  tokenName,
  tokenSymbol,
}: DelegateButtonProps) {
  const {
    balance,
    isDelegatedToSenate,
    senateVotingPower,
    delegateToSenate,
    isPending,
    isConfirming,
    isSuccess,
    currentDelegate,
  } = useDelegation(tokenAddress);

  return (
    <div className="p-6 rounded-xl bg-gray-900 border border-gray-800">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-semibold text-lg text-white">{tokenName}</h3>
          <p className="text-sm text-gray-500">{tokenSymbol}</p>
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
              ? "MetaSenate"
              : currentDelegate
              ? `${currentDelegate.slice(0, 6)}...${currentDelegate.slice(-4)}`
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

      <button
        onClick={delegateToSenate}
        disabled={
          isPending ||
          isConfirming ||
          isDelegatedToSenate ||
          Number(balance) === 0
        }
        className={`mt-4 w-full py-2.5 rounded-lg font-semibold transition-colors ${
          isDelegatedToSenate
            ? "bg-green-900/30 text-green-300 border border-green-800"
            : "bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-700 disabled:text-gray-500"
        }`}
      >
        {isSuccess || isDelegatedToSenate
          ? "Delegated to MetaSenate"
          : isPending
          ? "Confirm in wallet..."
          : isConfirming
          ? "Confirming..."
          : "Delegate to MetaSenate"}
      </button>
    </div>
  );
}
