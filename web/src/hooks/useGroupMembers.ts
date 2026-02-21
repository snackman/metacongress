"use client";

import { usePublicClient } from "wagmi";
import { useQuery } from "@tanstack/react-query";
import { parseAbiItem } from "viem";
import { SEMAPHORE_ADDRESS } from "@/lib/contracts";

export function useGroupMembers(groupId: bigint | undefined) {
  const publicClient = usePublicClient();

  return useQuery({
    queryKey: ["groupMembers", groupId?.toString()],
    queryFn: async () => {
      if (!publicClient || groupId === undefined) return [];

      // Fetch MemberAdded events from the Semaphore contract
      const logs = await publicClient.getLogs({
        address: SEMAPHORE_ADDRESS,
        event: parseAbiItem(
          "event MemberAdded(uint256 indexed groupId, uint256 index, uint256 identityCommitment, uint256 merkleTreeRoot)"
        ),
        args: { groupId },
        fromBlock: BigInt(0),
        toBlock: "latest",
      });

      return logs.map((log) => log.args.identityCommitment!);
    },
    enabled: !!publicClient && groupId !== undefined,
    staleTime: 30_000,
  });
}
