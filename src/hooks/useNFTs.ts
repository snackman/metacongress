"use client";

import { useQuery } from "@tanstack/react-query";
import { getNFTsForOwner } from "@/lib/alchemy";

export function useNFTs(
  walletAddress: string | undefined,
  contractAddress: string | undefined
) {
  return useQuery({
    queryKey: ["nfts", walletAddress, contractAddress],
    queryFn: () => getNFTsForOwner(walletAddress!, contractAddress!),
    enabled: !!walletAddress && !!contractAddress,
    staleTime: 60_000,
  });
}
