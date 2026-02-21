import { NextRequest, NextResponse } from "next/server";
import { createPublicClient, http, getAddress, verifyMessage } from "viem";
import { mainnet } from "viem/chains";
import { Identity } from "@semaphore-protocol/core";
import * as fs from "fs";
import * as path from "path";

const COMMITMENTS_DIR = path.join(process.cwd(), "commitments");

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

function getSignMessage(electionAddress: string, walletAddress: string): string {
  return `MetaSenate Election Identity\nElection: ${electionAddress}\nWallet: ${walletAddress}`;
}

function getCommitmentsPath(electionAddress: string): string {
  return path.join(COMMITMENTS_DIR, `${electionAddress.toLowerCase()}.json`);
}

interface StoredCommitment {
  wallet: string;
  commitment: string;
}

function readCommitments(electionAddress: string): StoredCommitment[] {
  const filePath = getCommitmentsPath(electionAddress);
  if (!fs.existsSync(filePath)) return [];
  const data = fs.readFileSync(filePath, "utf-8");
  return JSON.parse(data);
}

function writeCommitments(electionAddress: string, commitments: StoredCommitment[]) {
  if (!fs.existsSync(COMMITMENTS_DIR)) {
    fs.mkdirSync(COMMITMENTS_DIR, { recursive: true });
  }
  const filePath = getCommitmentsPath(electionAddress);
  fs.writeFileSync(filePath, JSON.stringify(commitments, null, 2));
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ address: string }> }
) {
  try {
    const { address: electionAddress } = await params;
    const body = await request.json();
    const { wallet, tokenId, commitment, signature, nftContract } = body;

    if (!wallet || !tokenId || !commitment || !signature || !nftContract) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // 1. Verify signature
    const message = getSignMessage(electionAddress, wallet);
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
      // Try standard ERC721 first
      owner = await client.readContract({
        address: getAddress(nftContract),
        abi: ERC721_OWNER_OF_ABI,
        functionName: "ownerOf",
        args: [BigInt(tokenId)],
      });
    } catch {
      // Fall back to CryptoPunks
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

    // 4. Store commitment (dedup by wallet)
    const commitments = readCommitments(electionAddress);
    const existing = commitments.find(
      (c) => c.wallet.toLowerCase() === wallet.toLowerCase()
    );
    if (existing) {
      return NextResponse.json(
        { error: "Wallet already submitted a commitment" },
        { status: 409 }
      );
    }

    commitments.push({ wallet, commitment });
    writeCommitments(electionAddress, commitments);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Commitment submission error:", err);
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
    const { address: electionAddress } = await params;
    const commitments = readCommitments(electionAddress);

    const commitmentValues = commitments.map((c) => c.commitment);

    // Build group and compute root if there are commitments
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
    console.error("Commitment fetch error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
