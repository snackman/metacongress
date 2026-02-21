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
import { SUPPORTED_COLLECTIONS, DAO_TOKENS } from "@/lib/constants";
import { NftPicker } from "@/components/NftPicker";
import Image from "next/image";

interface TokenNomination {
  tokenAddress: `0x${string}`;
  name: string;
  symbol: string;
  nominator: `0x${string}`;
  reason: string;
  timestamp: bigint;
  forRemoval: boolean;
}

function NominateTokenForm() {
  const { address } = useAccount();
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  const [mode, setMode] = useState<"add" | "remove">("add");
  const [tokenAddress, setTokenAddress] = useState("");
  const [name, setName] = useState("");
  const [symbol, setSymbol] = useState("");
  const [reason, setReason] = useState("");
  const [memberCollection, setMemberCollection] = useState("");
  const [memberTokenId, setMemberTokenId] = useState<string | null>(null);
  const [selectedDaoToken, setSelectedDaoToken] = useState<string | null>(null);

  const isValidAddress =
    tokenAddress.startsWith("0x") && tokenAddress.length === 42;

  const { data: fetchedName } = useReadContract({
    address: tokenAddress as `0x${string}`,
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
    query: { enabled: mode === "add" && isValidAddress },
  });

  const { data: fetchedSymbol } = useReadContract({
    address: tokenAddress as `0x${string}`,
    abi: [
      {
        type: "function" as const,
        name: "symbol",
        inputs: [],
        outputs: [{ name: "", type: "string" }],
        stateMutability: "view" as const,
      },
    ],
    functionName: "symbol",
    query: { enabled: mode === "add" && isValidAddress },
  });

  // Auto-fill name and symbol from contract
  useEffect(() => {
    if (mode === "add" && fetchedName && typeof fetchedName === "string") {
      setName(fetchedName);
    }
  }, [fetchedName, mode]);

  useEffect(() => {
    if (mode === "add" && fetchedSymbol && typeof fetchedSymbol === "string") {
      setSymbol(fetchedSymbol);
    }
  }, [fetchedSymbol, mode]);

  // Reset form fields when switching modes
  useEffect(() => {
    setTokenAddress("");
    setName("");
    setSymbol("");
    setReason("");
    setSelectedDaoToken(null);
  }, [mode]);

  if (!address) {
    return (
      <div className="p-6 rounded-xl bg-gray-900 border border-gray-800 text-center">
        <p className="text-gray-400">
          Connect your wallet to nominate a token
        </p>
      </div>
    );
  }

  function handleDaoTokenSelect(token: (typeof DAO_TOKENS)[number]) {
    setSelectedDaoToken(token.address);
    setTokenAddress(token.address);
    setName(token.name);
    setSymbol(token.symbol);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!tokenAddress || !name.trim() || !symbol.trim() || !memberCollection || !memberTokenId) return;
    writeContract({
      address: ELECTION_FACTORY_ADDRESS,
      abi: ELECTION_FACTORY_ABI,
      functionName: "nominateDelegationToken",
      args: [
        tokenAddress as `0x${string}`,
        name.trim(),
        symbol.trim(),
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
          Token nominated successfully!
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
          Add Token
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
          Remove Token
        </button>
      </div>

      <form
        onSubmit={handleSubmit}
        className="p-6 rounded-xl bg-gray-900 border border-gray-800 space-y-4"
      >
        <h3 className="text-lg font-semibold text-white">
          {mode === "add" ? "Nominate a Token for Addition" : "Nominate a Token for Removal"}
        </h3>

        {mode === "remove" ? (
          /* Remove mode: selectable DAO token grid */
          <div>
            <label className="block text-sm text-gray-400 mb-2">
              Select Token to Remove
            </label>
            <div className="grid grid-cols-2 gap-3">
              {DAO_TOKENS.map((token) => {
                const isSelected = selectedDaoToken === token.address;
                return (
                  <button
                    key={token.address}
                    type="button"
                    onClick={() => handleDaoTokenSelect(token)}
                    className={`flex items-center gap-3 p-3 rounded-lg border-2 transition-colors text-left ${
                      isSelected
                        ? "border-indigo-500 bg-indigo-500/10"
                        : "border-gray-700 bg-gray-800 hover:border-gray-500"
                    }`}
                  >
                    <div className="w-8 h-8 rounded-full bg-gray-800 overflow-hidden flex items-center justify-center flex-shrink-0">
                      <Image
                        src={token.logo}
                        alt={token.name}
                        width={32}
                        height={32}
                        className="object-contain"
                      />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">{token.name}</p>
                      <p className="text-xs text-gray-400">{token.symbol}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          /* Add mode: address input with auto-fill */
          <>
            <div>
              <label className="block text-sm text-gray-400 mb-1">
                Token Contract Address
              </label>
              <input
                type="text"
                value={tokenAddress}
                onChange={(e) => setTokenAddress(e.target.value)}
                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white font-mono text-sm focus:border-indigo-500 focus:outline-none"
                placeholder="0x..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">
                  Token Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:border-indigo-500 focus:outline-none"
                  placeholder="e.g. Uniswap"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">
                  Token Symbol
                </label>
                <input
                  type="text"
                  value={symbol}
                  onChange={(e) => setSymbol(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:border-indigo-500 focus:outline-none"
                  placeholder="e.g. UNI"
                />
              </div>
            </div>
          </>
        )}

        <div>
          <label className="block text-sm text-gray-400 mb-1">
            Reason (max 512 chars)
          </label>
          <textarea
            maxLength={512}
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:border-indigo-500 focus:outline-none resize-none"
            placeholder={
              mode === "remove"
                ? "Why should this token be removed..."
                : "Why should this token be added..."
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
            You must own a token in an existing whitelisted collection to
            nominate.
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
            {error.message.includes("TokenAlreadyNominated")
              ? "This token has already been nominated."
              : error.message.includes("TokenAlreadyApproved")
              ? "This token is already approved."
              : error.message.includes("TokenNotApproved")
              ? "This token is not currently approved (cannot nominate for removal)."
              : error.message.includes("NotCollectionMember")
              ? "You do not own that token ID in the selected collection."
              : error.message.includes("NotWhitelisted")
              ? "The selected member collection is not whitelisted."
              : "Transaction failed. Please try again."}
          </p>
        )}

        <button
          type="submit"
          disabled={
            !tokenAddress ||
            !name.trim() ||
            !symbol.trim() ||
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

function TokenNominationsList() {
  const { data } = useReadContract({
    address: ELECTION_FACTORY_ADDRESS,
    abi: ELECTION_FACTORY_ABI,
    functionName: "getTokenNominations",
  });

  const nominations = (data as TokenNomination[] | undefined) ?? [];

  if (nominations.length === 0) {
    return (
      <p className="text-gray-500 text-sm">
        No token nominations yet. Be the first!
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
              <h4 className="font-semibold text-white">
                {nom.name}{" "}
                <span className="text-gray-400 font-normal">
                  ({nom.symbol})
                </span>
              </h4>
              <p className="text-xs text-gray-500 font-mono mt-0.5">
                {nom.tokenAddress}
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

export default function NominateTokenPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-3xl font-bold text-white mb-2">
        Nominate a Delegation Token
      </h1>
      <p className="text-gray-400 mb-8">
        Propose a DAO governance token for addition or removal from the Meta
        Senate delegation list. Nominations are recorded on-chain and reviewed
        by the Senate.
      </p>

      <div className="grid lg:grid-cols-2 gap-8">
        <div>
          <NominateTokenForm />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-white mb-4">
            Token Nominations
          </h2>
          <TokenNominationsList />
        </div>
      </div>
    </div>
  );
}
