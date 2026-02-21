export const ELECTION_FACTORY_ADDRESS = (process.env.NEXT_PUBLIC_FACTORY_ADDRESS ??
  "0x0000000000000000000000000000000000000000") as `0x${string}`;

export const SENATE_SAFE_ADDRESS = (process.env.NEXT_PUBLIC_SENATE_SAFE_ADDRESS ??
  "0x0000000000000000000000000000000000000000") as `0x${string}`;

export const ELECTION_FACTORY_ABI = [
  {
    type: "function",
    name: "whitelisted",
    inputs: [{ name: "nftContract", type: "address" }],
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "collectionName",
    inputs: [{ name: "nftContract", type: "address" }],
    outputs: [{ name: "", type: "string" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "currentCycle",
    inputs: [{ name: "nftContract", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "elections",
    inputs: [
      { name: "nftContract", type: "address" },
      { name: "cycle", type: "uint256" },
    ],
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getElection",
    inputs: [
      { name: "nftContract", type: "address" },
      { name: "cycleNum", type: "uint256" },
    ],
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getWhitelistedCollections",
    inputs: [],
    outputs: [{ name: "", type: "address[]" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getWhitelistedCollectionCount",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getCurrentSenators",
    inputs: [{ name: "nftContract", type: "address" }],
    outputs: [{ name: "", type: "address[2]" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "senateSafe",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "createElection",
    inputs: [{ name: "nftContract", type: "address" }],
    outputs: [{ name: "", type: "address" }],
    stateMutability: "nonpayable",
  },
] as const;

export const SENATE_ELECTION_ABI = [
  {
    type: "function",
    name: "phase",
    inputs: [],
    outputs: [{ name: "", type: "uint8" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "nftContract",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "cycle",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "votingEndTime",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getCandidates",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "tuple[]",
        components: [
          { name: "wallet", type: "address" },
          { name: "nftTokenId", type: "uint256" },
          { name: "name", type: "string" },
          { name: "platform", type: "string" },
          { name: "profileImageUri", type: "string" },
          { name: "voteCount", type: "uint256" },
          { name: "registered", type: "bool" },
        ],
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getCandidateCount",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "hasVoted",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getVote",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [
      {
        name: "",
        type: "tuple",
        components: [
          { name: "voterTokenId", type: "uint256" },
          { name: "candidateIndex", type: "uint256" },
          { name: "comment", type: "string" },
          { name: "timestamp", type: "uint256" },
        ],
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getWinners",
    inputs: [],
    outputs: [{ name: "", type: "address[2]" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "declareCandidacy",
    inputs: [
      { name: "tokenId", type: "uint256" },
      { name: "name", type: "string" },
      { name: "platform", type: "string" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "updatePlatform",
    inputs: [{ name: "newPlatform", type: "string" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "vote",
    inputs: [
      { name: "tokenId", type: "uint256" },
      { name: "_candidateIndex", type: "uint256" },
      { name: "comment", type: "string" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "finalizeElection",
    inputs: [],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "event",
    name: "CandidacyDeclared",
    inputs: [
      { name: "candidate", type: "address", indexed: true },
      { name: "tokenId", type: "uint256", indexed: false },
      { name: "name", type: "string", indexed: false },
      { name: "platform", type: "string", indexed: false },
    ],
  },
  {
    type: "event",
    name: "VoteCast",
    inputs: [
      { name: "voter", type: "address", indexed: true },
      { name: "tokenId", type: "uint256", indexed: false },
      { name: "candidateIndex", type: "uint256", indexed: false },
      { name: "comment", type: "string", indexed: false },
    ],
  },
  {
    type: "event",
    name: "VotingOpened",
    inputs: [{ name: "endTime", type: "uint256", indexed: false }],
  },
  {
    type: "event",
    name: "ElectionFinalized",
    inputs: [{ name: "winners", type: "address[2]", indexed: false }],
  },
] as const;

export const ERC20_VOTES_ABI = [
  {
    type: "function",
    name: "balanceOf",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "delegates",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getVotes",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "delegate",
    inputs: [{ name: "delegatee", type: "address" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "symbol",
    inputs: [],
    outputs: [{ name: "", type: "string" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "decimals",
    inputs: [],
    outputs: [{ name: "", type: "uint8" }],
    stateMutability: "view",
  },
] as const;

export const GNOSIS_SAFE_ABI = [
  {
    type: "function",
    name: "getOwners",
    inputs: [],
    outputs: [{ name: "", type: "address[]" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "isOwner",
    inputs: [{ name: "owner", type: "address" }],
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getThreshold",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
] as const;
