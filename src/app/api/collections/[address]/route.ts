import { NextRequest, NextResponse } from "next/server";
import { createPublicClient, http, getAddress, verifyMessage } from "viem";
import { mainnet } from "viem/chains";
import * as fs from "fs";
import * as path from "path";

const COLLECTIONS_DIR = path.join(process.cwd(), "data", "collections");

const SENATE_SAFE_ADDRESS = (process.env.NEXT_PUBLIC_SENATE_SAFE_ADDRESS ??
  "0x0000000000000000000000000000000000000000") as `0x${string}`;

const GNOSIS_SAFE_ABI = [
  {
    type: "function" as const,
    name: "getOwners" as const,
    inputs: [],
    outputs: [{ name: "", type: "address[]" as const }],
    stateMutability: "view" as const,
  },
] as const;

interface CollectionMetadata {
  logoUrl?: string;
  description?: string;
  updatedAt?: string;
  updatedBy?: string;
}

function getMetadataPath(address: string): string {
  return path.join(COLLECTIONS_DIR, `${address.toLowerCase()}.json`);
}

function readMetadata(address: string): CollectionMetadata {
  const filePath = getMetadataPath(address);
  if (!fs.existsSync(filePath)) return {};
  const data = fs.readFileSync(filePath, "utf-8");
  return JSON.parse(data);
}

function writeMetadata(address: string, metadata: CollectionMetadata) {
  if (!fs.existsSync(COLLECTIONS_DIR)) {
    fs.mkdirSync(COLLECTIONS_DIR, { recursive: true });
  }
  const filePath = getMetadataPath(address);
  fs.writeFileSync(filePath, JSON.stringify(metadata, null, 2));
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ address: string }> }
) {
  try {
    const { address } = await params;
    const metadata = readMetadata(address);
    return NextResponse.json(metadata);
  } catch (err) {
    console.error("Collection metadata fetch error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ address: string }> }
) {
  try {
    const { address: collectionAddress } = await params;
    const body = await request.json();
    const { logoUrl, description, signature, timestamp, wallet } = body;

    if (!signature || !timestamp || !wallet) {
      return NextResponse.json(
        { error: "Missing required fields: signature, timestamp, wallet" },
        { status: 400 }
      );
    }

    // Verify timestamp is within 5 minutes
    const now = Math.floor(Date.now() / 1000);
    const ts = Number(timestamp);
    if (Math.abs(now - ts) > 300) {
      return NextResponse.json(
        { error: "Timestamp expired or invalid" },
        { status: 400 }
      );
    }

    // Verify signature
    const message = `MetaSenate Collection Update\nCollection: ${collectionAddress}\nTimestamp: ${timestamp}`;
    const isValid = await verifyMessage({
      address: getAddress(wallet),
      message,
      signature,
    });
    if (!isValid) {
      return NextResponse.json(
        { error: "Invalid signature" },
        { status: 401 }
      );
    }

    // Verify the signer is a Senate Safe owner (senator)
    const alchemyKey =
      process.env.ALCHEMY_API_KEY || process.env.NEXT_PUBLIC_ALCHEMY_API_KEY;
    const client = createPublicClient({
      chain: mainnet,
      transport: http(
        alchemyKey
          ? `https://eth-mainnet.g.alchemy.com/v2/${alchemyKey}`
          : undefined
      ),
    });

    const owners = await client.readContract({
      address: SENATE_SAFE_ADDRESS,
      abi: GNOSIS_SAFE_ABI,
      functionName: "getOwners",
    });

    const isOwner = (owners as string[]).some(
      (owner) => getAddress(owner) === getAddress(wallet)
    );
    if (!isOwner) {
      return NextResponse.json(
        { error: "Only senators (Safe owners) can update collection metadata" },
        { status: 403 }
      );
    }

    // Read existing metadata and update
    const existing = readMetadata(collectionAddress);
    const updated: CollectionMetadata = {
      ...existing,
      updatedAt: new Date().toISOString(),
      updatedBy: wallet,
    };

    if (logoUrl !== undefined) {
      updated.logoUrl = logoUrl;
    }
    if (description !== undefined) {
      updated.description = description;
    }

    writeMetadata(collectionAddress, updated);

    return NextResponse.json({ success: true, metadata: updated });
  } catch (err) {
    console.error("Collection metadata update error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
