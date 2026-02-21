"use client";

import { useEffect } from "react";
import {
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
  useAccount,
} from "wagmi";
import { ERC20_VOTES_ABI, SENATE_SAFE_ADDRESS } from "@/lib/contracts";
import { getChainId } from "@/lib/constants";
import { formatUnits } from "viem";

export function useDelegation(tokenAddress: `0x${string}`, chain?: string) {
  const { address } = useAccount();
  const chainId = chain ? getChainId(chain) : undefined;

  const { data: balance } = useReadContract({
    address: tokenAddress,
    abi: ERC20_VOTES_ABI,
    functionName: "balanceOf",
    args: [address!],
    chainId,
    query: { enabled: !!address },
  });

  const { data: currentDelegate, refetch: refetchDelegate } = useReadContract({
    address: tokenAddress,
    abi: ERC20_VOTES_ABI,
    functionName: "delegates",
    args: [address!],
    chainId,
    query: { enabled: !!address },
  });

  // Standard ERC20Votes: getVotes
  const { data: votesStandard, refetch: refetchStandard } = useReadContract({
    address: tokenAddress,
    abi: ERC20_VOTES_ABI,
    functionName: "getVotes",
    args: [SENATE_SAFE_ADDRESS],
    chainId,
  });

  // Legacy (UNI, COMP): getCurrentVotes
  const { data: votesLegacy, refetch: refetchLegacy } = useReadContract({
    address: tokenAddress,
    abi: ERC20_VOTES_ABI,
    functionName: "getCurrentVotes",
    args: [SENATE_SAFE_ADDRESS],
    chainId,
  });

  // Use whichever returns data
  const senateVotingPowerRaw = votesStandard ?? votesLegacy;

  function refetchVotingPower() {
    refetchStandard();
    refetchLegacy();
  }

  const { data: decimals } = useReadContract({
    address: tokenAddress,
    abi: ERC20_VOTES_ABI,
    functionName: "decimals",
    chainId,
  });

  const { writeContract, data: hash, isPending, error, reset } = useWriteContract();

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  useEffect(() => {
    if (isSuccess) {
      refetchDelegate();
      refetchVotingPower();
    }
  }, [isSuccess, refetchDelegate]);

  function delegateToSenate() {
    writeContract({
      address: tokenAddress,
      abi: ERC20_VOTES_ABI,
      functionName: "delegate",
      args: [SENATE_SAFE_ADDRESS],
      chainId,
    });
  }

  function undelegateFromSenate() {
    if (!address) return;
    writeContract({
      address: tokenAddress,
      abi: ERC20_VOTES_ABI,
      functionName: "delegate",
      args: [address],
      chainId,
    });
  }

  const isDelegatedToSenate =
    SENATE_SAFE_ADDRESS !== "0x0000000000000000000000000000000000000000" &&
    currentDelegate?.toLowerCase() === SENATE_SAFE_ADDRESS.toLowerCase();

  return {
    balance: balance
      ? formatUnits(balance, Number(decimals ?? 18))
      : "0",
    currentDelegate,
    isDelegatedToSenate,
    senateVotingPower: senateVotingPowerRaw
      ? formatUnits(senateVotingPowerRaw, Number(decimals ?? 18))
      : "0",
    delegateToSenate,
    undelegateFromSenate,
    isPending,
    isConfirming,
    isSuccess,
    error,
    reset,
  };
}
