"use client";

import { useState, useEffect } from "react";
import {
  useAccount,
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import { AddressDisplay } from "@/components/AddressDisplay";
import {
  ELECTION_FACTORY_ABI,
  ELECTION_FACTORY_ADDRESS,
} from "@/lib/contracts";
import { SUPPORTED_COLLECTIONS } from "@/lib/constants";
import { NftPicker } from "@/components/NftPicker";
import Image from "next/image";

interface Nomination {
  nftContract: `0x${string}`;
  name: string;
  nominator: `0x${string}`;
  reason: string;
  timestamp: bigint;
  forRemoval: boolean;
}

function NominationForm() {
  const { address } = useAccount();
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  const [mode, setMode] = useState<"add" | "remove">("add");
  const [contractAddress, setContractAddress] = useState("");
  const [collectionName, setCollectionName] = useState("");
  const [reason, setReason] = useState("");
  const [memberCollection, setMemberCollection] = useState("");
  const [memberTokenId, setMemberTokenId] = useState<string | null>(null);
  const [selectedCollection, setSelectedCollection] = useState<string | null>(null);

  const isValidAddress =
    contractAddress.startsWith("0x") && contractAddress.length === 42;

  const { data: fetchedCollectionName } = useReadContract({
    address: contractAddress as `0x${string}`,
    abi: [
      {
        type: "function" as const,
        name: "name",
        inputs: [],
        outputs: [{ name: "", type: "string" }],
        stateMutability: "view" as const,
      },
    ],
    functionName: "name",
    query: {
      enabled: mode === "add" && isValidAddress,
    },
  });

  // Auto-fill collection name from contract in add mode
  useEffect(() => {
    if (
      mode === "add" &&
      fetchedCollectionName &&
      typeof fetchedCollectionName === "string"
    ) {
      setCollectionName(fetchedCollectionName);
    }
  }, [fetchedCollectionName, mode]);

  // Reset form fields when switching modes
  useEffect(() => {
    setContractAddress("");
    setCollectionName("");
    setReason("");
    setSelectedCollection(null);
  }, [mode]);

  if (!address) {
    return (
      <div className="p-6 rounded-xl bg-gray-900 border border-gray-800 text-center">
        <p className="text-gray-400">
          Connect your wallet to nominate a community
        </p>
      </div>
    );
  }

  // Derive the display name for add mode from fetched contract data
  const resolvedName =
    mode === "add" &&
    fetchedCollectionName &&
    typeof fetchedCollectionName === "string"
      ? fetchedCollectionName
      : collectionName;

  function handleCollectionSelect(
    col: (typeof SUPPORTED_COLLECTIONS)[number]
  ) {
    setSelectedCollection(col.address);
    setContractAddress(col.address);
    setCollectionName(col.name);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const nameToSubmit = mode === "add" ? resolvedName : collectionName;
    if (
      !contractAddress ||
      !nameToSubmit ||
      !memberCollection ||
      !memberTokenId
    )
      return;
    writeContract({
      address: ELECTION_FACTORY_ADDRESS,
      abi: ELECTION_FACTORY_ABI,
      functionName: "nominateCollection",
      args: [
        contractAddress as `0x${string}`,
        nameToSubmit,
        reason.trim(),
        mode === "remove",
        memberCollection as `0x${string}`,
        BigInt(memberTokenId),
      ],
    });
  }

  if (isSuccess) {
    return (
      <div className="p-6 rounded-xl bg-green-900/30 border border-green-700 text-center">
        <p className="text-green-300 font-semibold">
          Community nominated successfully!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Add / Remove toggle */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setMode("add")}
          className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
            mode === "add"
              ? "bg-indigo-600 text-white"
              : "bg-transparent text-gray-400 border border-gray-700 hover:border-gray-500"
          }`}
        >
          Add Community
        </button>
        <button
          type="button"
          onClick={() => setMode("remove")}
          className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
            mode === "remove"
              ? "bg-indigo-600 text-white"
              : "bg-transparent text-gray-400 border border-gray-700 hover:border-gray-500"
          }`}
        >
          Remove Community
        </button>
      </div>

      <form
        onSubmit={handleSubmit}
        className="p-6 rounded-xl bg-gray-900 border border-gray-800 space-y-4"
      >
        <h3 className="text-lg font-semibold text-white">
          {mode === "add"
            ? "Nominate a Community for Addition"
            : "Nominate a Community for Removal"}
        </h3>

        {mode === "remove" ? (
          /* Remove mode: selectable collection grid */
          <div>
            <label className="block text-sm text-gray-400 mb-2">
              Select Community to Remove
            </label>
            <div className="grid grid-cols-2 gap-3">
              {SUPPORTED_COLLECTIONS.map((col) => {
                const isSelected = selectedCollection === col.address;
                return (
                  <button
                    key={col.address}
                    type="button"
                    onClick={() => handleCollectionSelect(col)}
                    className={`flex items-center gap-3 p-3 rounded-lg border-2 transition-colors text-left ${
                      isSelected
                        ? "border-indigo-500 bg-indigo-500/10"
                        : "border-gray-700 bg-gray-800 hover:border-gray-500"
                    }`}
                  >
                    <Image
                      src={col.logo}
                      alt={col.name}
                      width={32}
                      height={32}
                      className="rounded-full"
                    />
                    <div>
                      <p className="text-sm font-medium text-white">
                        {col.name}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          /* Add mode: address input with auto-fill */
          <div>
            <label className="block text-sm text-gray-400 mb-1">
              NFT Contract Address
            </label>
            <input
              type="text"
              value={contractAddress}
              onChange={(e) => setContractAddress(e.target.value)}
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white font-mono text-sm focus:border-indigo-500 focus:outline-none"
              placeholder="0x..."
            />
            {resolvedName && (
              <p className="text-sm text-green-400 mt-1">
                Detected: {resolvedName}
              </p>
            )}
            {isValidAddress && !resolvedName && (
              <p className="text-xs text-yellow-400 mt-1">
                Could not detect collection name. Check the address.
              </p>
            )}
          </div>
        )}

        <div>
          <label className="block text-sm text-gray-400 mb-1">
            {mode === "remove"
              ? "Why should this community be removed? (max 512 chars)"
              : "Why should this community join the Meta Senate? (max 512 chars)"}
          </label>
          <textarea
            maxLength={512}
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:border-indigo-500 focus:outline-none resize-none"
            placeholder={
              mode === "remove"
                ? "Why should this community be removed..."
                : "This community should be represented because..."
            }
          />
          <p className="text-xs text-gray-500 mt-1">
            {reason.length}/512 characters
          </p>
        </div>

        <div className="p-4 rounded-lg bg-gray-800/50 border border-gray-700 space-y-3">
          <h4 className="text-sm font-semibold text-white">
            Select Nominating NFT
          </h4>
          <p className="text-xs text-gray-400">
            Select the NFT you&apos;ll use to nominate this community. You must
            own a token in an existing whitelisted collection.
          </p>

          <div>
            <label className="block text-sm text-gray-400 mb-1">
              Your Member Collection
            </label>
            <select
              value={memberCollection}
              onChange={(e) => {
                setMemberCollection(e.target.value);
                setMemberTokenId(null);
              }}
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:border-indigo-500 focus:outline-none"
            >
              <option value="">Select a collection...</option>
              {SUPPORTED_COLLECTIONS.map((col) => (
                <option key={col.address} value={col.address}>
                  {col.name}
                </option>
              ))}
            </select>
          </div>

          <NftPicker
            memberCollection={memberCollection}
            selectedTokenId={memberTokenId}
            onSelect={setMemberTokenId}
          />
        </div>

        {error && (
          <p className="text-red-400 text-sm">
            {error.message.includes("AlreadyNominated")
              ? "This collection has already been nominated."
              : error.message.includes("AlreadyWhitelisted")
              ? "This collection is already a member."
              : error.message.includes("CollectionNotWhitelisted")
              ? "This collection is not currently whitelisted (cannot nominate for removal)."
              : error.message.includes("NotMember")
              ? "You do not own that token ID in the selected collection."
              : error.message.includes("InvalidMemberCollection")
              ? "The selected member collection is not whitelisted."
              : "Transaction failed. Please try again."}
          </p>
        )}

        <button
          type="submit"
          disabled={
            !contractAddress ||
            !(mode === "add" ? resolvedName : collectionName) ||
            !memberCollection ||
            !memberTokenId ||
            isPending ||
            isConfirming
          }
          className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-700 disabled:text-gray-500 rounded-lg font-semibold transition-colors"
        >
          {isPending
            ? "Confirm in wallet..."
            : isConfirming
            ? "Confirming..."
            : "Submit Nomination"}
        </button>
      </form>
    </div>
  );
}

function NominationsList() {
  const { data } = useReadContract({
    address: ELECTION_FACTORY_ADDRESS,
    abi: ELECTION_FACTORY_ABI,
    functionName: "getNominations",
  });

  const nominations = (data as Nomination[] | undefined) ?? [];

  if (nominations.length === 0) {
    return (
      <p className="text-gray-500 text-sm">
        No nominations yet. Be the first!
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {nominations.map((nom, i) => (
        <div
          key={i}
          className="p-5 rounded-xl bg-gray-900 border border-gray-800"
        >
          <div className="flex items-start justify-between">
            <div>
              <h4 className="font-semibold text-white">{nom.name}</h4>
              <p className="text-xs text-gray-500 font-mono mt-0.5">
                {nom.nftContract}
              </p>
            </div>
            <span
              className={`px-2.5 py-0.5 text-xs font-medium rounded-full ${
                nom.forRemoval
                  ? "bg-red-500/20 text-red-300"
                  : "bg-green-500/20 text-green-300"
              }`}
            >
              {nom.forRemoval ? "Remove" : "Add"}
            </span>
          </div>
          {nom.reason && (
            <p className="mt-3 text-sm text-gray-300">{nom.reason}</p>
          )}
          <p className="mt-2 text-xs text-gray-600">
            Nominated by{" "}
            <AddressDisplay address={nom.nominator} /> on{" "}
            {new Date(Number(nom.timestamp) * 1000).toLocaleDateString()}
          </p>
        </div>
      ))}
    </div>
  );
}

export default function NominatePage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-3xl font-bold text-white mb-2">
        Nominate a Community
      </h1>
      <p className="text-gray-400 mb-8">
        Propose an NFT community for addition or removal from the Meta Senate.
        Nominations are recorded on-chain and reviewed by the Senate.
      </p>

      <div className="grid lg:grid-cols-2 gap-8">
        <div>
          <NominationForm />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-white mb-4">
            Community Nominations
          </h2>
          <NominationsList />
        </div>
      </div>
    </div>
  );
}
