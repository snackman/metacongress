"use client";

import { useState } from "react";
import { useDeclareCandidacyAllocation } from "@/hooks/useVote";
import { useNFTs } from "@/hooks/useNFTs";
import { useAccount } from "wagmi";
import type { OwnedNft } from "alchemy-sdk";

interface DeclareCandidacyAllocationProps {
  allocationAddress: `0x${string}`;
  nftContractAddress: string;
}

export function DeclareCandidacyAllocation({
  allocationAddress,
  nftContractAddress,
}: DeclareCandidacyAllocationProps) {
  const { address } = useAccount();
  const { data: nfts, isLoading: nftsLoading } = useNFTs(
    address,
    nftContractAddress
  );
  const { declareCandidacy, isPending, isConfirming, isSuccess } =
    useDeclareCandidacyAllocation(allocationAddress);

  const [selectedNft, setSelectedNft] = useState<OwnedNft | null>(null);
  const [name, setName] = useState("");
  const [platform, setPlatform] = useState("");

  if (!address) {
    return (
      <div className="p-6 rounded-xl bg-gray-900 border border-gray-800 text-center">
        <p className="text-gray-400">Connect your wallet to declare candidacy</p>
      </div>
    );
  }

  if (nftsLoading) {
    return (
      <div className="p-6 rounded-xl bg-gray-900 border border-gray-800 text-center">
        <p className="text-gray-400">Loading your NFTs...</p>
      </div>
    );
  }

  if (!nfts || nfts.length === 0) {
    return (
      <div className="p-6 rounded-xl bg-gray-900 border border-gray-800 text-center">
        <p className="text-gray-400">
          You don&apos;t hold any NFTs from this collection
        </p>
      </div>
    );
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedNft || !name.trim()) return;
    declareCandidacy(BigInt(selectedNft.tokenId), name.trim(), platform.trim());
  }

  if (isSuccess) {
    return (
      <div className="p-6 rounded-xl bg-green-900/30 border border-green-700 text-center">
        <p className="text-green-300 font-semibold">
          Candidacy declared successfully!
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="p-6 rounded-xl bg-gray-900 border border-gray-800 space-y-4"
    >
      <h3 className="text-lg font-semibold text-white">Declare Candidacy</h3>

      <div>
        <label className="block text-sm text-gray-400 mb-2">
          Select your campaign NFT
        </label>
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
          {nfts.map((nft) => {
            const imgUrl =
              nft.image?.thumbnailUrl ??
              nft.image?.cachedUrl ??
              nft.image?.originalUrl;
            return (
              <button
                key={nft.tokenId}
                type="button"
                onClick={() => setSelectedNft(nft)}
                className={`rounded-lg border overflow-hidden ${
                  selectedNft?.tokenId === nft.tokenId
                    ? "border-indigo-500 ring-2 ring-indigo-500/50"
                    : "border-gray-700 hover:border-gray-500"
                }`}
              >
                {imgUrl ? (
                  <img
                    src={imgUrl}
                    alt={`#${nft.tokenId}`}
                    className="w-full aspect-square object-cover"
                  />
                ) : (
                  <div className="w-full aspect-square bg-gray-800 flex items-center justify-center text-gray-500 text-xs">
                    No image
                  </div>
                )}
                <p className="text-xs text-gray-400 py-1 text-center">
                  #{nft.tokenId}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <label className="block text-sm text-gray-400 mb-1">
          Display Name (max 64 chars)
        </label>
        <input
          type="text"
          maxLength={64}
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:border-indigo-500 focus:outline-none"
          placeholder="Your senator name"
        />
      </div>

      <div>
        <label className="block text-sm text-gray-400 mb-1">
          Platform Statement (max 1024 chars)
        </label>
        <textarea
          maxLength={1024}
          rows={4}
          value={platform}
          onChange={(e) => setPlatform(e.target.value)}
          className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:border-indigo-500 focus:outline-none resize-none"
          placeholder="What will you do as senator?"
        />
        <p className="text-xs text-gray-500 mt-1">
          {platform.length}/1024 characters
        </p>
      </div>

      <button
        type="submit"
        disabled={!selectedNft || !name.trim() || isPending || isConfirming}
        className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-700 disabled:text-gray-500 rounded-lg font-semibold transition-colors"
      >
        {isPending
          ? "Confirm in wallet..."
          : isConfirming
          ? "Confirming..."
          : "Declare Candidacy"}
      </button>
    </form>
  );
}
