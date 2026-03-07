"use client";

import { useState, useCallback } from "react";
import { Group, generateProof } from "@semaphore-protocol/core";
import type { Identity } from "@semaphore-protocol/core";

// Sentinel value used as proof.message for withdraw operations.
// The contract ignores proof.message for withdrawVote, but the ZK proof
// generation requires a message value. Using type(uint256).max as sentinel.
const WITHDRAW_SENTINEL = BigInt(
  "115792089237316195423570985008687907853269984665640564039457584007913129639935"
);

export interface BatchProgressUpdate {
  phase: "proving" | "submitting" | "done" | "error";
  tokenId: string;
  current: number;
  total: number;
  error?: string;
}

export interface BatchVoteResults {
  succeeded: string[];
  failed: Array<{ tokenId: string; error: string }>;
}

async function fetchCommitments(allocationAddress: string) {
  const res = await fetch(`/api/allocation/${allocationAddress}/commitments`);
  if (!res.ok) throw new Error("Failed to fetch commitments");
  return res.json() as Promise<{
    commitments: string[];
    root: string;
    count: number;
  }>;
}

/** Submit a proof to the relay without touching hook-level loading state. */
async function submitToRelayRaw(
  allocationAddress: string,
  proof: {
    merkleTreeDepth: number;
    merkleTreeRoot: bigint | string;
    nullifier: bigint | string;
    message: bigint | string;
    scope: bigint | string;
    points: (bigint | string)[];
  },
  comment: string,
  functionName: "allocateVote" | "withdrawVote"
) {
  const res = await fetch(
    `/api/allocation/${allocationAddress}/relay`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        proof: {
          merkleTreeDepth: proof.merkleTreeDepth.toString(),
          merkleTreeRoot: proof.merkleTreeRoot.toString(),
          nullifier: proof.nullifier.toString(),
          message: proof.message.toString(),
          scope: proof.scope.toString(),
          points: proof.points.map((p) => p.toString()),
        },
        comment,
        functionName,
      }),
    }
  );

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || "Relay request failed");
  }

  if (data.status !== "success") {
    throw new Error("Transaction reverted on-chain");
  }

  return data.hash as `0x${string}`;
}

export function useAllocateVote(
  allocationAddress: `0x${string}` | undefined
) {
  const [isGeneratingProof, setIsGeneratingProof] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [hash, setHash] = useState<`0x${string}` | undefined>(undefined);

  // Batch state
  const [isBatchVoting, setIsBatchVoting] = useState(false);
  const [batchProgress, setBatchProgress] = useState<{
    current: number;
    total: number;
    phase: string;
    tokenId: string;
  } | null>(null);

  const scope = allocationAddress ? BigInt(allocationAddress) : undefined;

  const reset = useCallback(() => {
    setIsGeneratingProof(false);
    setIsSending(false);
    setIsConfirming(false);
    setIsSuccess(false);
    setError(null);
    setHash(undefined);
    setIsBatchVoting(false);
    setBatchProgress(null);
  }, []);

  const submitToRelay = useCallback(
    async (
      proof: {
        merkleTreeDepth: number;
        merkleTreeRoot: bigint | string;
        nullifier: bigint | string;
        message: bigint | string;
        scope: bigint | string;
        points: (bigint | string)[];
      },
      comment: string,
      functionName: "allocateVote" | "withdrawVote"
    ) => {
      if (!allocationAddress) return;

      setIsSending(true);
      setError(null);

      try {
        const res = await fetch(
          `/api/allocation/${allocationAddress}/relay`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              proof: {
                merkleTreeDepth: proof.merkleTreeDepth.toString(),
                merkleTreeRoot: proof.merkleTreeRoot.toString(),
                nullifier: proof.nullifier.toString(),
                message: proof.message.toString(),
                scope: proof.scope.toString(),
                points: proof.points.map((p) => p.toString()),
              },
              comment,
              functionName,
            }),
          }
        );

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || "Relay request failed");
        }

        setIsSending(false);
        setIsConfirming(true);
        setHash(data.hash as `0x${string}`);

        // The relay already waits for confirmation, so if we got a response
        // with a hash, the transaction is confirmed.
        if (data.status === "success") {
          setIsConfirming(false);
          setIsSuccess(true);
        } else {
          throw new Error("Transaction reverted on-chain");
        }
      } catch (err) {
        setIsSending(false);
        setIsConfirming(false);
        setError(
          err instanceof Error ? err : new Error("Unknown relay error")
        );
      }
    },
    [allocationAddress]
  );

  const allocateVote = useCallback(
    async (identity: Identity, candidateIndex: number, comment: string) => {
      if (!allocationAddress || !scope) return;

      setIsGeneratingProof(true);
      setIsSuccess(false);
      setError(null);
      setHash(undefined);
      try {
        // Fetch latest commitments just before proof generation
        const commitmentsData = await fetchCommitments(allocationAddress);
        if (!commitmentsData.commitments.length) {
          throw new Error("No commitments found — please try again shortly");
        }

        const group = new Group(commitmentsData.commitments.map(BigInt));

        const proof = await generateProof(
          identity,
          group,
          candidateIndex,
          scope
        );

        setIsGeneratingProof(false);

        await submitToRelay(proof, comment, "allocateVote");
      } catch (err) {
        setIsGeneratingProof(false);
        if (!error) {
          setError(
            err instanceof Error ? err : new Error("Proof generation failed")
          );
        }
      }
    },
    [allocationAddress, scope, submitToRelay, error]
  );

  const batchAllocateVote = useCallback(
    async (
      votes: Array<{ identity: Identity; tokenId: string }>,
      candidateIndex: number,
      comment: string,
      onProgress?: (update: BatchProgressUpdate) => void
    ): Promise<BatchVoteResults> => {
      if (!allocationAddress || !scope) {
        return { succeeded: [], failed: [] };
      }

      const results: BatchVoteResults = { succeeded: [], failed: [] };

      setIsBatchVoting(true);
      setError(null);

      try {
        // Fetch commitments once for the entire batch
        const commitmentsData = await fetchCommitments(allocationAddress);
        if (!commitmentsData.commitments.length) {
          throw new Error("No commitments found — please try again shortly");
        }

        const group = new Group(commitmentsData.commitments.map(BigInt));

        for (let i = 0; i < votes.length; i++) {
          const { identity, tokenId } = votes[i];

          try {
            // Phase: proving
            setBatchProgress({
              current: i + 1,
              total: votes.length,
              phase: "Generating ZK proof...",
              tokenId,
            });
            onProgress?.({
              phase: "proving",
              tokenId,
              current: i + 1,
              total: votes.length,
            });

            const proof = await generateProof(
              identity,
              group,
              candidateIndex,
              scope
            );

            // Phase: submitting
            setBatchProgress({
              current: i + 1,
              total: votes.length,
              phase: "Submitting vote...",
              tokenId,
            });
            onProgress?.({
              phase: "submitting",
              tokenId,
              current: i + 1,
              total: votes.length,
            });

            await submitToRelayRaw(
              allocationAddress,
              proof,
              comment,
              "allocateVote"
            );

            results.succeeded.push(tokenId);
            onProgress?.({
              phase: "done",
              tokenId,
              current: i + 1,
              total: votes.length,
            });
          } catch (err) {
            const errorMsg =
              err instanceof Error ? err.message : "Unknown error";
            results.failed.push({ tokenId, error: errorMsg });
            onProgress?.({
              phase: "error",
              tokenId,
              current: i + 1,
              total: votes.length,
              error: errorMsg,
            });
          }
        }
      } catch (err) {
        // Top-level failure (e.g. couldn't fetch commitments)
        const errorMsg =
          err instanceof Error ? err.message : "Unknown error";
        for (const { tokenId } of votes) {
          if (
            !results.succeeded.includes(tokenId) &&
            !results.failed.some((f) => f.tokenId === tokenId)
          ) {
            results.failed.push({ tokenId, error: errorMsg });
          }
        }
      }

      setIsBatchVoting(false);
      setBatchProgress(null);
      return results;
    },
    [allocationAddress, scope]
  );

  const withdrawVote = useCallback(
    async (identity: Identity) => {
      if (!allocationAddress || !scope) return;

      setIsGeneratingProof(true);
      setIsSuccess(false);
      setError(null);
      setHash(undefined);
      try {
        const commitmentsData = await fetchCommitments(allocationAddress);
        if (!commitmentsData.commitments.length) {
          throw new Error("No commitments found");
        }

        const group = new Group(commitmentsData.commitments.map(BigInt));

        const proof = await generateProof(
          identity,
          group,
          WITHDRAW_SENTINEL,
          scope
        );

        setIsGeneratingProof(false);

        await submitToRelay(proof, "", "withdrawVote");
      } catch (err) {
        setIsGeneratingProof(false);
        if (!error) {
          setError(
            err instanceof Error ? err : new Error("Proof generation failed")
          );
        }
      }
    },
    [allocationAddress, scope, submitToRelay, error]
  );

  return {
    allocateVote,
    batchAllocateVote,
    withdrawVote,
    isGeneratingProof,
    isSending,
    isConfirming,
    isSuccess,
    isBatchVoting,
    batchProgress,
    error,
    hash,
    reset,
  };
}
