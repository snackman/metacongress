"use client";

import { useQuery } from "@tanstack/react-query";
import type { ExternalProposal } from "@/lib/types";

export function useExternalProposals(filters?: {
  dao?: string;
  state?: string;
}) {
  return useQuery({
    queryKey: ["external-proposals", filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.dao) params.set("dao", filters.dao);
      if (filters?.state) params.set("state", filters.state);

      const res = await fetch(`/api/proposals/external?${params}`);
      if (!res.ok) throw new Error("Failed to fetch proposals");
      const data = await res.json();
      return data.proposals as ExternalProposal[];
    },
    staleTime: 60_000,
    refetchInterval: 120_000,
  });
}
