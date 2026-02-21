"use client";

import { useState } from "react";
import { SwapModal } from "./SwapModal";

interface SwapButtonProps {
  tokenAddress: `0x${string}`;
  tokenSymbol: string;
  chain: string;
}

export function SwapButton({ tokenAddress, tokenSymbol, chain }: SwapButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="py-2.5 px-4 rounded-lg font-semibold transition-colors bg-pink-600/20 text-pink-300 border border-pink-800 hover:bg-pink-600/30"
      >
        Buy
      </button>
      {open && (
        <SwapModal
          tokenAddress={tokenAddress}
          tokenSymbol={tokenSymbol}
          chain={chain}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
