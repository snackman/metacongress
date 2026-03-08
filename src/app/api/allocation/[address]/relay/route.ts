import { NextRequest, NextResponse } from "next/server";
import {
  createWalletClient,
  createPublicClient,
  http,
  getAddress,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { mainnet } from "viem/chains";
import {
  SENATE_ALLOCATION_ABI,
  ELECTION_FACTORY_ABI,
  ELECTION_FACTORY_ADDRESS,
} from "@/lib/contracts";
import { getSupabase } from "@/lib/supabase";
import { Group } from "@semaphore-protocol/core";

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

    const contractAddress = getAddress(allocationAddress);

    // Check if the on-chain eligibility root matches the proof's Merkle root.
    // If not, auto-update the root before submitting the vote.
    const onChainRoot = await publicClient.readContract({
      address: contractAddress,
      abi: SENATE_ALLOCATION_ABI,
      functionName: "eligibilityRoot",
    });

    const proofRoot = BigInt(proof.merkleTreeRoot);

    console.log("Relay root check:", {
      onChainRoot: (onChainRoot as bigint).toString(),
      proofRoot: proofRoot.toString(),
      match: BigInt(onChainRoot as bigint) === proofRoot,
    });

    if (BigInt(onChainRoot as bigint) !== proofRoot) {
      // Root mismatch — need to update on-chain root first.
      // Read the NFT contract address from the allocation contract.
      const nftContract = await publicClient.readContract({
        address: contractAddress,
        abi: SENATE_ALLOCATION_ABI,
        functionName: "nftContract",
      }) as `0x${string}`;

      // Compute the current root from all commitments in the DB.
      const supabase = getSupabase();
      const { data: commitments } = await supabase
        .from("allocation_commitments")
        .select("commitment")
        .eq("allocation_address", allocationAddress.toLowerCase());

      if (commitments && commitments.length > 0) {
        const group = new Group(commitments.map((c: { commitment: string }) => BigInt(c.commitment)));
        const dbRoot = group.root;

        // Only update if the DB root matches what the proof expects
        if (dbRoot === proofRoot) {
          const deployerKey = process.env.DEPLOYER_PRIVATE_KEY;
          const updateAccount = deployerKey
            ? privateKeyToAccount(deployerKey as `0x${string}`)
            : account;
          const updateWalletClient = createWalletClient({
            account: updateAccount,
            chain: mainnet,
            transport: http(rpcUrl),
          });

          const updateHash = await updateWalletClient.writeContract({
            address: ELECTION_FACTORY_ADDRESS,
            abi: ELECTION_FACTORY_ABI,
            functionName: "updateAllocationRoot",
            args: [getAddress(nftContract), dbRoot],
          });
          await publicClient.waitForTransactionReceipt({ hash: updateHash });
        } else {
          return NextResponse.json(
            { error: "Proof root does not match current commitments. Please try again." },
            { status: 409 }
          );
        }
      } else {
        return NextResponse.json(
          { error: "No commitments found in database" },
          { status: 409 }
        );
      }
    }

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

    // Use writeContract with simulation for better error messages
    let hash: `0x${string}`;

    try {
      if (functionName === "allocateVote") {
        // Simulate first to get readable error on failure
        const { request: simRequest } = await publicClient.simulateContract({
          address: contractAddress,
          abi: SENATE_ALLOCATION_ABI,
          functionName: "allocateVote",
          args: [proofTuple, comment],
          account: account,
        });
        hash = await walletClient.writeContract(simRequest);
      } else {
        const { request: simRequest } = await publicClient.simulateContract({
          address: contractAddress,
          abi: SENATE_ALLOCATION_ABI,
          functionName: "withdrawVote",
          args: [proofTuple],
          account: account,
        });
        hash = await walletClient.writeContract(simRequest);
      }
    } catch (simErr: unknown) {
      // Extract detailed revert reason from simulation failure
      console.error("Contract simulation/execution failed:", simErr);

      let revertReason = "Transaction would revert";

      if (simErr && typeof simErr === "object") {
        const errObj = simErr as Record<string, unknown>;

        // Viem ContractFunctionExecutionError has nested cause with revert data
        if (errObj.cause && typeof errObj.cause === "object") {
          const cause = errObj.cause as Record<string, unknown>;
          // Check for decoded error name (e.g., "InvalidProof", "NullifierAlreadyUsed")
          if (cause.data && typeof cause.data === "object") {
            const data = cause.data as Record<string, unknown>;
            if (data.errorName) {
              revertReason = `${data.errorName}${data.args ? `(${JSON.stringify(data.args)})` : ""}`;
            }
          }
          // Check for raw revert reason string
          if (cause.reason && typeof cause.reason === "string") {
            revertReason = cause.reason;
          }
          // Check shortMessage
          if (cause.shortMessage && typeof cause.shortMessage === "string") {
            revertReason = cause.shortMessage;
          }
        }

        // Top-level shortMessage from viem
        if (errObj.shortMessage && typeof errObj.shortMessage === "string") {
          revertReason = errObj.shortMessage;
        }

        // Include metaMessages for additional context
        if (Array.isArray(errObj.metaMessages) && errObj.metaMessages.length > 0) {
          revertReason += " | " + errObj.metaMessages.join(" | ");
        }
      }

      // Log full diagnostic info
      console.error("Relay diagnostic info:", {
        contractAddress,
        functionName,
        proofMerkleRoot: proof.merkleTreeRoot,
        proofNullifier: proof.nullifier,
        proofMessage: proof.message,
        proofScope: proof.scope,
        revertReason,
      });

      return NextResponse.json(
        { error: revertReason },
        { status: 422 }
      );
    }

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
