"use client";

import { useState } from "react";
import { useAccount } from "wagmi";
import { useNFTs } from "@/hooks/useNFTs";
import { useIdentity } from "@/hooks/useIdentity";
import { useRegisterVoter } from "@/hooks/useRegisterVoter";
import type { OwnedNft } from "alchemy-sdk";

interface VoterRegistrationProps {
  electionAddress: `0x${string}`;
  nftContractAddress: string;
  voterRegistrationEndTime: number;
}

export function VoterRegistration({
  electionAddress,
  nftContractAddress,
  voterRegistrationEndTime,
}: VoterRegistrationProps) {
  const { address } = useAccount();
  const { data: nfts } = useNFTs(address, nftContractAddress);
  const { commitment, createIdentity, hasIdentity, isCreating } =
    useIdentity(electionAddress);
  const {
    registerVoter,
    isPending,
    isConfirming,
    isSuccess,
    error,
  } = useRegisterVoter(electionAddress);

  const [selectedToken, setSelectedToken] = useState<OwnedNft | null>(null);

  const timeLeft = voterRegistrationEndTime * 1000 - Date.now();
  const registrationEnded = timeLeft <= 0;

  if (!address) {
    return (
      <div className="p-6 rounded-xl bg-gray-900 border border-gray-800 text-center">
        <p className="text-gray-400">Connect your wallet to register as a voter</p>
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div className="p-6 rounded-xl bg-green-900/30 border border-green-700 text-center">
        <p className="text-green-300 font-semibold">
          Voter registration successful! Your anonymous identity is registered.
        </p>
        <p className="text-gray-400 text-sm mt-2">
          You can cast your anonymous vote once the voting phase begins.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">Register to Vote</h3>
        <span
          className={`text-sm ${
            registrationEnded ? "text-red-400" : "text-indigo-400"
          }`}
        >
          {registrationEnded
            ? "Registration ended"
            : `Ends ${new Date(voterRegistrationEndTime * 1000).toLocaleDateString()}`}
        </span>
      </div>

      <div className="p-4 rounded-lg bg-gray-900 border border-gray-800">
        <p className="text-sm text-gray-400 mb-4">
          Create an anonymous identity to vote privately. Your vote will be
          verified using zero-knowledge proofs — nobody can see who you voted for.
        </p>

        {/* Step 1: Create Identity */}
        {!hasIdentity ? (
          <button
            onClick={createIdentity}
            disabled={isCreating || registrationEnded}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-700 disabled:text-gray-500 rounded-lg font-semibold transition-colors"
          >
            {isCreating ? "Sign message in wallet..." : "Create Anonymous Identity"}
          </button>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="text-green-400 text-sm">Identity created</span>
              <span className="text-gray-600 text-xs font-mono truncate">
                {commitment?.toString().slice(0, 20)}...
              </span>
            </div>

            {/* Step 2: Select NFT token */}
            {!registrationEnded && nfts && nfts.length > 0 && (
              <div>
                <label className="block text-sm text-gray-400 mb-2">
                  Select NFT to register with
                </label>
                <div className="flex gap-2 flex-wrap">
                  {nfts.map((nft) => (
                    <button
                      key={nft.tokenId}
                      type="button"
                      onClick={() => setSelectedToken(nft)}
                      className={`px-3 py-1.5 rounded-lg border text-sm ${
                        selectedToken?.tokenId === nft.tokenId
                          ? "border-indigo-500 bg-indigo-500/10"
                          : "border-gray-700 hover:border-gray-500"
                      }`}
                    >
                      #{nft.tokenId}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Step 3: Register */}
            {!registrationEnded && selectedToken && commitment && (
              <button
                onClick={() =>
                  registerVoter(BigInt(selectedToken.tokenId), commitment)
                }
                disabled={isPending || isConfirming}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-700 disabled:text-gray-500 rounded-lg font-semibold transition-colors"
              >
                {isPending
                  ? "Confirm in wallet..."
                  : isConfirming
                  ? "Confirming..."
                  : "Register to Vote"}
              </button>
            )}

            {error && (
              <p className="text-red-400 text-sm">
                {error.message.includes("AlreadyRegistered")
                  ? "This NFT is already registered."
                  : "Registration failed. Please try again."}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
