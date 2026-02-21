"use client";

import { useState, useCallback, useEffect } from "react";
import { useAccount, useSignMessage } from "wagmi";
import { Identity } from "@semaphore-protocol/core";

const STORAGE_PREFIX = "semaphore-identity-";

function getStorageKey(
  electionAddress: string,
  walletAddress: string
): string {
  return `${STORAGE_PREFIX}${electionAddress.toLowerCase()}-${walletAddress.toLowerCase()}`;
}

function getSignMessage(
  electionAddress: string,
  walletAddress: string
): string {
  return `MetaSenate Election Identity\nElection: ${electionAddress}\nWallet: ${walletAddress}`;
}

export function useIdentity(electionAddress: `0x${string}` | undefined) {
  const { address } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const [identity, setIdentity] = useState<Identity | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  // Try to load from localStorage on mount
  useEffect(() => {
    if (!electionAddress || !address) {
      setIdentity(null);
      return;
    }

    const key = getStorageKey(electionAddress, address);
    const stored = localStorage.getItem(key);
    if (stored) {
      try {
        setIdentity(new Identity(stored));
      } catch {
        localStorage.removeItem(key);
      }
    }
  }, [electionAddress, address]);

  const createIdentity = useCallback(async () => {
    if (!electionAddress || !address) return;

    setIsCreating(true);
    try {
      const message = getSignMessage(electionAddress, address);
      const signature = await signMessageAsync({ message });

      // Derive identity deterministically from the signature
      const id = new Identity(signature);

      // Persist to localStorage
      const key = getStorageKey(electionAddress, address);
      localStorage.setItem(key, id.export());

      setIdentity(id);
    } finally {
      setIsCreating(false);
    }
  }, [electionAddress, address, signMessageAsync]);

  return {
    identity,
    commitment: identity ? identity.commitment : null,
    createIdentity,
    hasIdentity: !!identity,
    isCreating,
  };
}
