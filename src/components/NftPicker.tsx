"use client";

import { useAccount } from "wagmi";
import { useNFTs } from "@/hooks/useNFTs";
import Image from "next/image";

interface NftPickerProps {
  memberCollection: string;
  selectedTokenId: string | null;
  onSelect: (tokenId: string) => void;
}

export function NftPicker({
  memberCollection,
  selectedTokenId,
  onSelect,
}: NftPickerProps) {
  const { address } = useAccount();
  const { data: nfts, isLoading } = useNFTs(address, memberCollection);

  if (!memberCollection) return null;

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 py-4">
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
        <span className="text-sm text-gray-400">Loading your NFTs...</span>
      </div>
    );
  }

  if (!nfts || nfts.length === 0) {
    return (
      <p className="text-sm text-gray-400 py-2">
        You don&apos;t own any NFTs in this collection.
      </p>
    );
  }

  return (
    <div className="flex flex-wrap gap-3">
      {nfts.map((nft) => {
        const tokenId = nft.tokenId;
        const isSelected = selectedTokenId === tokenId;
        const thumbnail =
          nft.image?.thumbnailUrl || nft.image?.cachedUrl || nft.image?.originalUrl;

        return (
          <button
            key={tokenId}
            type="button"
            onClick={() => onSelect(tokenId)}
            className={`flex flex-col items-center gap-1 p-1.5 rounded-lg border-2 transition-colors cursor-pointer ${
              isSelected
                ? "border-indigo-500 bg-indigo-500/10"
                : "border-gray-700 bg-gray-800 hover:border-gray-500"
            }`}
          >
            <div className="w-14 h-14 rounded overflow-hidden bg-gray-700 flex items-center justify-center">
              {thumbnail ? (
                <Image
                  src={thumbnail}
                  alt={`#${tokenId}`}
                  width={56}
                  height={56}
                  className="object-cover w-full h-full"
                  unoptimized
                />
              ) : (
                <span className="text-xs text-gray-500">?</span>
              )}
            </div>
            <span className="text-xs text-gray-300 font-mono">#{tokenId}</span>
          </button>
        );
      })}
    </div>
  );
}
