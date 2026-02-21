"use client";

import { useState, useCallback, useEffect } from "react";
import { useAccount, useSignMessage } from "wagmi";
import { Identity } from "@semaphore-protocol/core";

const STORAGE_PREFIX = "semaphore-allocation-";

function getStorageKey(
  allocationAddress: string,
  walletAddress: string,
  tokenId: string
): string {
  return `${STORAGE_PREFIX}${allocationAddress.toLowerCase()}-${walletAddress.toLowerCase()}-${tokenId}`;
}

function getSignMessage(
  allocationAddress: string,
  walletAddress: string,
  tokenId: string
): string {
  return `MetaSenate Vote Allocation\nAllocation: ${allocationAddress}\nWallet: ${walletAddress}\nTokenId: ${tokenId}`;
}

export { getSignMessage as getAllocationSignMessage };

export function useAllocationIdentity(
  allocationAddress: `0x${string}` | undefined
) {
  const { address } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const [identities, setIdentities] = useState<Map<string, Identity>>(new Map());
  const [isCreating, setIsCreating] = useState(false);

  // Load stored identities for all known token IDs
  useEffect(() => {
    if (!allocationAddress || !address) {
      setIdentities(new Map());
      return;
    }

    const loaded = new Map<string, Identity>();
    // Scan localStorage for matching keys
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;
      const prefix = `${STORAGE_PREFIX}${allocationAddress.toLowerCase()}-${address.toLowerCase()}-`;
      if (key.startsWith(prefix)) {
        const tokenId = key.slice(prefix.length);
        const stored = localStorage.getItem(key);
        if (stored) {
          try {
            loaded.set(tokenId, new Identity(stored));
          } catch {
            localStorage.removeItem(key);
          }
        }
      }
    }
    setIdentities(loaded);
  }, [allocationAddress, address]);

  const createIdentity = useCallback(async (tokenId: string) => {
    if (!allocationAddress || !address) return null;

    setIsCreating(true);
    try {
      const message = getSignMessage(allocationAddress, address, tokenId);
      const signature = await signMessageAsync({ message });

      const id = new Identity(signature);

      const key = getStorageKey(allocationAddress, address, tokenId);
      localStorage.setItem(key, id.export());

      setIdentities((prev) => {
        const next = new Map(prev);
        next.set(tokenId, id);
        return next;
      });

      return id;
    } finally {
      setIsCreating(false);
    }
  }, [allocationAddress, address, signMessageAsync]);

  return {
    identities,
    getIdentity: (tokenId: string) => identities.get(tokenId) ?? null,
    createIdentity,
    hasIdentity: (tokenId: string) => identities.has(tokenId),
    hasAnyIdentity: identities.size > 0,
    isCreating,
  };
}
