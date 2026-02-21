"use client";

import { useEnsName } from "wagmi";

interface AddressDisplayProps {
  address: `0x${string}`;
  className?: string;
}

/**
 * Displays an ENS name when available, falling back to a truncated address.
 * Use this component wherever an Ethereum address is shown to a user,
 * especially in list contexts where calling useEnsName directly would
 * violate the rules of hooks.
 */
export function AddressDisplay({ address, className }: AddressDisplayProps) {
  const { data: ensName } = useEnsName({ address });

  return (
    <span className={className}>
      {ensName ?? `${address.slice(0, 6)}...${address.slice(-4)}`}
    </span>
  );
}
