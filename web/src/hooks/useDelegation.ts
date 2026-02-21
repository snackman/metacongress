"use client";

import {
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
  useAccount,
} from "wagmi";
import { ERC20_VOTES_ABI, SENATE_SAFE_ADDRESS } from "@/lib/contracts";
import { formatUnits } from "viem";

export function useDelegation(tokenAddress: `0x${string}`) {
  const { address } = useAccount();

  const { data: balance } = useReadContract({
    address: tokenAddress,
    abi: ERC20_VOTES_ABI,
    functionName: "balanceOf",
    args: [address!],
    query: { enabled: !!address },
  });

  const { data: currentDelegate } = useReadContract({
    address: tokenAddress,
    abi: ERC20_VOTES_ABI,
    functionName: "delegates",
    args: [address!],
    query: { enabled: !!address },
  });

  const { data: senateVotingPower } = useReadContract({
    address: tokenAddress,
    abi: ERC20_VOTES_ABI,
    functionName: "getVotes",
    args: [SENATE_SAFE_ADDRESS],
  });

  const { data: decimals } = useReadContract({
    address: tokenAddress,
    abi: ERC20_VOTES_ABI,
    functionName: "decimals",
  });

  const { writeContract, data: hash, isPending, error } = useWriteContract();

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  function delegateToSenate() {
    writeContract({
      address: tokenAddress,
      abi: ERC20_VOTES_ABI,
      functionName: "delegate",
      args: [SENATE_SAFE_ADDRESS],
    });
  }

  const isDelegatedToSenate =
    currentDelegate?.toLowerCase() === SENATE_SAFE_ADDRESS.toLowerCase();

  return {
    balance: balance
      ? formatUnits(balance, Number(decimals ?? 18))
      : "0",
    currentDelegate,
    isDelegatedToSenate,
    senateVotingPower: senateVotingPower
      ? formatUnits(senateVotingPower, Number(decimals ?? 18))
      : "0",
    delegateToSenate,
    isPending,
    isConfirming,
    isSuccess,
    error,
  };
}
