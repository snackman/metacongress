"use client";

import { useState, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAccount, useSignMessage } from "wagmi";

interface CollectionMetadata {
  logoUrl?: string;
  description?: string;
  updatedAt?: string;
  updatedBy?: string;
}

export function useCollectionMetadata(address: string | undefined) {
  const { data, isLoading } = useQuery<CollectionMetadata>({
    queryKey: ["collection-metadata", address?.toLowerCase()],
    queryFn: async () => {
      const res = await fetch(`/api/collections/${address}`);
      if (!res.ok) return {};
      return res.json();
    },
    enabled: !!address,
    staleTime: 60_000,
  });

  return {
    metadata: data ?? {},
    isLoading,
  };
}

export function useUpdateCollectionMetadata(address: string | undefined) {
  const { address: wallet } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const queryClient = useQueryClient();
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateMetadata = useCallback(
    async (fields: { logoUrl?: string; description?: string }) => {
      if (!address || !wallet) {
        setError("Wallet not connected");
        return false;
      }

      setIsUpdating(true);
      setError(null);

      try {
        const timestamp = Math.floor(Date.now() / 1000).toString();
        const message = `MetaSenate Collection Update\nCollection: ${address}\nTimestamp: ${timestamp}`;
        const signature = await signMessageAsync({ message });

        const res = await fetch(`/api/collections/${address}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...fields,
            signature,
            timestamp,
            wallet,
          }),
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Failed to update metadata");
        }

        // Invalidate the query so fresh data is fetched
        queryClient.invalidateQueries({
          queryKey: ["collection-metadata", address.toLowerCase()],
        });

        return true;
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Update failed";
        setError(msg);
        return false;
      } finally {
        setIsUpdating(false);
      }
    },
    [address, wallet, signMessageAsync, queryClient]
  );

  return {
    updateMetadata,
    isUpdating,
    error,
    clearError: () => setError(null),
  };
}
