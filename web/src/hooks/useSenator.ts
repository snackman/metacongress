"use client";

import { useReadContract } from "wagmi";
import { GNOSIS_SAFE_ABI, SENATE_SAFE_ADDRESS } from "@/lib/contracts";

export function useIsSenator(walletAddress: `0x${string}` | undefined) {
  const { data } = useReadContract({
    address: SENATE_SAFE_ADDRESS,
    abi: GNOSIS_SAFE_ABI,
    functionName: "isOwner",
    args: [walletAddress!],
    query: { enabled: !!walletAddress },
  });

  return data ?? false;
}

export function useSafeOwners() {
  const { data } = useReadContract({
    address: SENATE_SAFE_ADDRESS,
    abi: GNOSIS_SAFE_ABI,
    functionName: "getOwners",
  });

  return (data as `0x${string}`[] | undefined) ?? [];
}
