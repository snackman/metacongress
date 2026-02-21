import { NextRequest, NextResponse } from "next/server";
import {
  createWalletClient,
  createPublicClient,
  http,
  encodeFunctionData,
  getAddress,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { mainnet } from "viem/chains";
import { SENATE_ALLOCATION_ABI } from "@/lib/contracts";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ address: string }> }
) {
  try {
    const relayPrivateKey = process.env.RELAY_PRIVATE_KEY;
    if (!relayPrivateKey) {
      return NextResponse.json(
        { error: "Relay not configured" },
        { status: 503 }
      );
    }

    const { address: allocationAddress } = await params;
    const body = await request.json();
    const { proof, comment, functionName } = body;

    // Validate functionName
    if (functionName !== "allocateVote" && functionName !== "withdrawVote") {
      return NextResponse.json(
        { error: "Invalid functionName. Must be 'allocateVote' or 'withdrawVote'" },
        { status: 400 }
      );
    }

    // Validate proof structure
    if (
      !proof ||
      proof.merkleTreeDepth === undefined ||
      proof.merkleTreeRoot === undefined ||
      proof.nullifier === undefined ||
      proof.message === undefined ||
      proof.scope === undefined ||
      !Array.isArray(proof.points) ||
      proof.points.length !== 8
    ) {
      return NextResponse.json(
        { error: "Invalid proof structure" },
        { status: 400 }
      );
    }

    if (functionName === "allocateVote" && typeof comment !== "string") {
      return NextResponse.json(
        { error: "Comment is required for allocateVote" },
        { status: 400 }
      );
    }

    const alchemyKey =
      process.env.ALCHEMY_API_KEY || process.env.NEXT_PUBLIC_ALCHEMY_API_KEY;
    const rpcUrl = alchemyKey
      ? `https://eth-mainnet.g.alchemy.com/v2/${alchemyKey}`
      : undefined;

    const account = privateKeyToAccount(
      relayPrivateKey as `0x${string}`
    );

    const walletClient = createWalletClient({
      account,
      chain: mainnet,
      transport: http(rpcUrl),
    });

    const publicClient = createPublicClient({
      chain: mainnet,
      transport: http(rpcUrl),
    });

    // Build the proof tuple with BigInt values
    const proofTuple = {
      merkleTreeDepth: BigInt(proof.merkleTreeDepth),
      merkleTreeRoot: BigInt(proof.merkleTreeRoot),
      nullifier: BigInt(proof.nullifier),
      message: BigInt(proof.message),
      scope: BigInt(proof.scope),
      points: proof.points.map((p: string | number) => BigInt(p)) as [
        bigint,
        bigint,
        bigint,
        bigint,
        bigint,
        bigint,
        bigint,
        bigint,
      ],
    };

    let data: `0x${string}`;
    if (functionName === "allocateVote") {
      data = encodeFunctionData({
        abi: SENATE_ALLOCATION_ABI,
        functionName: "allocateVote",
        args: [proofTuple, comment],
      });
    } else {
      data = encodeFunctionData({
        abi: SENATE_ALLOCATION_ABI,
        functionName: "withdrawVote",
        args: [proofTuple],
      });
    }

    const contractAddress = getAddress(allocationAddress);

    const hash = await walletClient.sendTransaction({
      to: contractAddress,
      data,
    });

    // Wait for confirmation
    const receipt = await publicClient.waitForTransactionReceipt({ hash });

    return NextResponse.json({
      hash,
      status: receipt.status,
    });
  } catch (err: unknown) {
    console.error("Relay transaction error:", err);
    const message =
      err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
