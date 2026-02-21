import { NextRequest, NextResponse } from "next/server";
import { encodeFunctionData, isAddress } from "viem";
import type { Hex } from "viem";
import { OZ_GOVERNOR_ABI, GOVERNOR_BRAVO_ABI } from "@/lib/contracts";

const SUPPORTED_CHAINS: Record<
  number,
  { name: string; safeTransactionServiceUrl: string }
> = {
  1: {
    name: "Ethereum Mainnet",
    safeTransactionServiceUrl:
      "https://safe-transaction-mainnet.safe.global",
  },
  42161: {
    name: "Arbitrum",
    safeTransactionServiceUrl:
      "https://safe-transaction-arbitrum.safe.global",
  },
  10: {
    name: "Optimism",
    safeTransactionServiceUrl:
      "https://safe-transaction-optimism.safe.global",
  },
};

const SUPPORT_LABELS: Record<number, string> = {
  0: "Against",
  1: "For",
  2: "Abstain",
};

interface VoteRequest {
  governorAddress: string;
  proposalId: string;
  support: number;
  reason?: string;
  governorType: "ozGovernor" | "governorBravo";
  chainId: number;
}

export async function POST(request: NextRequest) {
  try {
    const body: VoteRequest = await request.json();
    const { governorAddress, proposalId, support, reason, governorType, chainId } =
      body;

    // --- Validation ---

    if (!governorAddress || !isAddress(governorAddress)) {
      return NextResponse.json(
        { error: "Invalid or missing governorAddress" },
        { status: 400 }
      );
    }

    if (!proposalId) {
      return NextResponse.json(
        { error: "Missing proposalId" },
        { status: 400 }
      );
    }

    if (support !== 0 && support !== 1 && support !== 2) {
      return NextResponse.json(
        { error: "Invalid support value. Must be 0 (Against), 1 (For), or 2 (Abstain)" },
        { status: 400 }
      );
    }

    if (governorType !== "ozGovernor" && governorType !== "governorBravo") {
      return NextResponse.json(
        { error: "Invalid governorType. Must be 'ozGovernor' or 'governorBravo'" },
        { status: 400 }
      );
    }

    const chainConfig = SUPPORTED_CHAINS[chainId];
    if (!chainConfig) {
      return NextResponse.json(
        {
          error: `Unsupported chainId ${chainId}. Supported chains: ${Object.keys(SUPPORTED_CHAINS).join(", ")}`,
        },
        { status: 400 }
      );
    }

    const safeAddress = process.env.NEXT_PUBLIC_SENATE_SAFE_ADDRESS;
    if (!safeAddress) {
      return NextResponse.json(
        { error: "Senate Safe address not configured" },
        { status: 503 }
      );
    }

    // --- Encode calldata ---

    const abi =
      governorType === "ozGovernor" ? OZ_GOVERNOR_ABI : GOVERNOR_BRAVO_ABI;

    let data: Hex;

    if (reason) {
      data = encodeFunctionData({
        abi,
        functionName: "castVoteWithReason",
        args: [BigInt(proposalId), support, reason],
      });
    } else {
      data = encodeFunctionData({
        abi,
        functionName: "castVote",
        args: [BigInt(proposalId), support],
      });
    }

    // --- Build response ---

    const supportLabel = SUPPORT_LABELS[support];
    const description = `Vote ${supportLabel} on proposal #${proposalId}${reason ? ` with reason: "${reason}"` : ""}`;

    return NextResponse.json({
      to: governorAddress,
      data,
      value: "0",
      chainId,
      description,
      safeTransactionServiceUrl: chainConfig.safeTransactionServiceUrl,
    });
  } catch (err: unknown) {
    console.error("Proposal vote encoding error:", err);
    const message =
      err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
