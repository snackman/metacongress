"use client";

import { useState, useCallback, useEffect } from "react";
import { useAccount, useSignMessage } from "wagmi";
import { Identity } from "@semaphore-protocol/core";

const STORAGE_PREFIX = "semaphore-allocation-";

function getStorageKey(
  allocationAddress: string,
  walletAddress: string
): string {
  return `${STORAGE_PREFIX}${allocationAddress.toLowerCase()}-${walletAddress.toLowerCase()}`;
}

function getSignMessage(
  allocationAddress: string,
  walletAddress: string
): string {
  return `MetaSenate Vote Allocation\nAllocation: ${allocationAddress}\nWallet: ${walletAddress}`;
}

export { getSignMessage as getAllocationSignMessage };

export function useAllocationIdentity(
  allocationAddress: `0x${string}` | undefined
) {
  const { address } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const [identity, setIdentity] = useState<Identity | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    if (!allocationAddress || !address) {
      setIdentity(null);
      return;
    }

    const key = getStorageKey(allocationAddress, address);
    const stored = localStorage.getItem(key);
    if (stored) {
      try {
        setIdentity(new Identity(stored));
      } catch {
        localStorage.removeItem(key);
      }
    }
  }, [allocationAddress, address]);

  const createIdentity = useCallback(async () => {
    if (!allocationAddress || !address) return;

    setIsCreating(true);
    try {
      const message = getSignMessage(allocationAddress, address);
      const signature = await signMessageAsync({ message });

      const id = new Identity(signature);

      const key = getStorageKey(allocationAddress, address);
      localStorage.setItem(key, id.export());

      setIdentity(id);
    } finally {
      setIsCreating(false);
    }
  }, [allocationAddress, address, signMessageAsync]);

  return {
    identity,
    commitment: identity ? identity.commitment : null,
    createIdentity,
    hasIdentity: !!identity,
    isCreating,
  };
}
