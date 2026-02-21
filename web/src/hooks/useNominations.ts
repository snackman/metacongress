"use client";

import { useReadContract } from "wagmi";
import {
  ELECTION_FACTORY_ABI,
  ELECTION_FACTORY_ADDRESS,
} from "@/lib/contracts";

export interface Nomination {
  nftContract: `0x${string}`;
  name: string;
  nominator: `0x${string}`;
  reason: string;
  timestamp: bigint;
  forRemoval: boolean;
}

export function useNominations() {
  const { data, isLoading } = useReadContract({
    address: ELECTION_FACTORY_ADDRESS,
    abi: ELECTION_FACTORY_ABI,
    functionName: "getNominations",
  });

  const nominations = (data as Nomination[] | undefined) ?? [];

  return { nominations, isLoading };
}
