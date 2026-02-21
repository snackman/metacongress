import { NextRequest, NextResponse } from "next/server";
import { createPublicClient, http, getAddress, verifyMessage, keccak256, toBytes } from "viem";
import { mainnet } from "viem/chains";
import { Identity } from "@semaphore-protocol/core";
import * as fs from "fs";
import * as path from "path";

const COMMITMENTS_DIR = path.join(process.cwd(), "commitments");

/** Delay (ms) before a commitment is included in the active Merkle tree.
 *  Default 0 for dev; set COMMITMENT_DELAY_MS=86400000 in production for 24h. */
const COMMITMENT_DELAY_MS = Number(process.env.COMMITMENT_DELAY_MS ?? "0");

const ERC721_OWNER_OF_ABI = [
  {
    type: "function",
    name: "ownerOf",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
  },
] as const;

const CRYPTO_PUNKS_ABI = [
  {
    type: "function",
    name: "punkIndexToAddress",
    inputs: [{ name: "punkIndex", type: "uint256" }],
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
  },
] as const;

function getSignMessage(allocationAddress: string, walletAddress: string, tokenId: string): string {
  return `MetaSenate Vote Allocation\nAllocation: ${allocationAddress}\nWallet: ${walletAddress}\nTokenId: ${tokenId}`;
}

function getCommitmentsPath(allocationAddress: string): string {
  return path.join(COMMITMENTS_DIR, `allocation-${allocationAddress.toLowerCase()}.json`);
}

interface StoredCommitment {
  ownerHash: string;
  commitment: string;
  submittedAt: number;
}

function readCommitments(allocationAddress: string): StoredCommitment[] {
  const filePath = getCommitmentsPath(allocationAddress);
  if (!fs.existsSync(filePath)) return [];
  const data = fs.readFileSync(filePath, "utf-8");
  return JSON.parse(data);
}

function writeCommitments(allocationAddress: string, commitments: StoredCommitment[]) {
  if (!fs.existsSync(COMMITMENTS_DIR)) {
    fs.mkdirSync(COMMITMENTS_DIR, { recursive: true });
  }
  const filePath = getCommitmentsPath(allocationAddress);
  fs.writeFileSync(filePath, JSON.stringify(commitments, null, 2));
}

/** Compute a deterministic hash of wallet+tokenId for deduplication without storing raw values. */
function computeOwnerHash(wallet: string, tokenId: string): string {
  return keccak256(toBytes(`${wallet.toLowerCase()}:${tokenId}`));
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ address: string }> }
) {
  try {
    const { address: allocationAddress } = await params;
    const body = await request.json();
    const { wallet, tokenId, commitment, signature, nftContract } = body;

    if (!wallet || !tokenId || !commitment || !signature || !nftContract) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // 1. Verify signature
    const message = getSignMessage(allocationAddress, wallet, tokenId);
    const isValid = await verifyMessage({
      address: getAddress(wallet),
      message,
      signature,
    });
    if (!isValid) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    // 2. Verify NFT ownership
    const alchemyKey = process.env.ALCHEMY_API_KEY || process.env.NEXT_PUBLIC_ALCHEMY_API_KEY;
    const client = createPublicClient({
      chain: mainnet,
      transport: http(
        alchemyKey
          ? `https://eth-mainnet.g.alchemy.com/v2/${alchemyKey}`
          : undefined
      ),
    });

    let owner: string;
    try {
      owner = await client.readContract({
        address: getAddress(nftContract),
        abi: ERC721_OWNER_OF_ABI,
        functionName: "ownerOf",
        args: [BigInt(tokenId)],
      });
    } catch {
      owner = await client.readContract({
        address: getAddress(nftContract),
        abi: CRYPTO_PUNKS_ABI,
        functionName: "punkIndexToAddress",
        args: [BigInt(tokenId)],
      });
    }

    if (getAddress(owner) !== getAddress(wallet)) {
      return NextResponse.json(
        { error: "Wallet does not own this token" },
        { status: 403 }
      );
    }

    // 3. Verify commitment matches identity derived from signature
    const identity = new Identity(signature);
    if (identity.commitment.toString() !== commitment) {
      return NextResponse.json(
        { error: "Commitment does not match signature-derived identity" },
        { status: 400 }
      );
    }

    // 4. Store commitment using ownerHash for deduplication (no raw wallet stored)
    const ownerHash = computeOwnerHash(wallet, tokenId);
    const commitments = readCommitments(allocationAddress);
    const existingIdx = commitments.findIndex(
      (c) => c.ownerHash === ownerHash
    );
    const now = Date.now();
    if (existingIdx >= 0) {
      commitments[existingIdx] = { ownerHash, commitment, submittedAt: now };
    } else {
      commitments.push({ ownerHash, commitment, submittedAt: now });
    }
    writeCommitments(allocationAddress, commitments);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Allocation commitment submission error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ address: string }> }
) {
  try {
    const { address: allocationAddress } = await params;
    const commitments = readCommitments(allocationAddress);

    // Only include commitments that have matured past the configured delay
    const now = Date.now();
    const matured = commitments.filter(
      (c) => now - c.submittedAt >= COMMITMENT_DELAY_MS
    );

    const commitmentValues = matured.map((c) => c.commitment);

    let root = "0";
    if (commitmentValues.length > 0) {
      const { Group } = await import("@semaphore-protocol/core");
      const group = new Group(commitmentValues.map(BigInt));
      root = group.root.toString();
    }

    return NextResponse.json({
      commitments: commitmentValues,
      root,
      count: commitmentValues.length,
    });
  } catch (err) {
    console.error("Allocation commitment fetch error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
