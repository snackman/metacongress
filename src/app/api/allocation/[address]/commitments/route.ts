import { NextRequest, NextResponse } from "next/server";
import { createPublicClient, createWalletClient, http, getAddress, verifyMessage, keccak256, toBytes } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { mainnet } from "viem/chains";
import { Identity, Group } from "@semaphore-protocol/core";
import { ELECTION_FACTORY_ABI, ELECTION_FACTORY_ADDRESS } from "@/lib/contracts";
import { supabase } from "@/lib/supabase";

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

/** Compute a deterministic hash of wallet+tokenId for deduplication without storing raw values. */
function computeOwnerHash(wallet: string, tokenId: string): string {
  return keccak256(toBytes(`${wallet.toLowerCase()}:${tokenId}`));
}

interface StoredCommitment {
  owner_hash: string;
  commitment: string;
  submitted_at: number;
}

async function readCommitments(allocationAddress: string): Promise<StoredCommitment[]> {
  const { data, error } = await supabase
    .from("allocation_commitments")
    .select("owner_hash, commitment, submitted_at")
    .eq("allocation_address", allocationAddress.toLowerCase());

  if (error) {
    console.error("Supabase read error:", error);
    return [];
  }
  return data ?? [];
}

async function upsertCommitment(
  allocationAddress: string,
  ownerHash: string,
  commitment: string,
  submittedAt: number
): Promise<void> {
  const { error } = await supabase
    .from("allocation_commitments")
    .upsert(
      {
        allocation_address: allocationAddress.toLowerCase(),
        owner_hash: ownerHash,
        commitment,
        submitted_at: submittedAt,
      },
      { onConflict: "allocation_address,owner_hash" }
    );

  if (error) {
    console.error("Supabase upsert error:", error);
    throw new Error("Failed to store commitment");
  }
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
    const now = Date.now();
    await upsertCommitment(allocationAddress, ownerHash, commitment, now);

    // Auto-push updated eligibility root on-chain
    const deployerKey = process.env.DEPLOYER_PRIVATE_KEY;
    if (deployerKey) {
      try {
        // Re-read all commitments to compute root
        const commitments = await readCommitments(allocationAddress);
        const now2 = Date.now();
        const matured = commitments.filter(
          (c) => now2 - c.submitted_at >= COMMITMENT_DELAY_MS
        );
        const commitmentValues = matured.map((c) => c.commitment);

        if (commitmentValues.length > 0) {
          const group = new Group(commitmentValues.map(BigInt));
          const newRoot = group.root;

          const account = privateKeyToAccount(deployerKey as `0x${string}`);
          const walletClient = createWalletClient({
            account,
            chain: mainnet,
            transport: http(
              alchemyKey
                ? `https://eth-mainnet.g.alchemy.com/v2/${alchemyKey}`
                : undefined
            ),
          });
          const publicClient2 = createPublicClient({
            chain: mainnet,
            transport: http(
              alchemyKey
                ? `https://eth-mainnet.g.alchemy.com/v2/${alchemyKey}`
                : undefined
            ),
          });

          // Read current on-chain root from allocation contract to avoid unnecessary tx
          const onChainRoot = await publicClient2.readContract({
            address: getAddress(allocationAddress),
            abi: [{ type: "function", name: "eligibilityRoot", inputs: [], outputs: [{ type: "uint256" }], stateMutability: "view" }] as const,
            functionName: "eligibilityRoot",
          });

          if (BigInt(onChainRoot) !== newRoot) {
            const hash = await walletClient.writeContract({
              address: ELECTION_FACTORY_ADDRESS as `0x${string}`,
              abi: ELECTION_FACTORY_ABI,
              functionName: "updateAllocationRoot",
              args: [getAddress(nftContract), newRoot],
            });
            await publicClient2.waitForTransactionReceipt({ hash });
          }
        }
      } catch (rootErr) {
        console.error("Failed to auto-push eligibility root:", rootErr);
        // Don't fail the commitment — root push is best-effort
      }
    }

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
    const commitments = await readCommitments(allocationAddress);

    // Only include commitments that have matured past the configured delay
    const now = Date.now();
    const matured = commitments.filter(
      (c) => now - c.submitted_at >= COMMITMENT_DELAY_MS
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
