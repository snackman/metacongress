export const ELECTION_FACTORY_ADDRESS = (process.env.NEXT_PUBLIC_FACTORY_ADDRESS ??
  "0x0000000000000000000000000000000000000000") as `0x${string}`;

export const SENATE_SAFE_ADDRESS = (process.env.NEXT_PUBLIC_SENATE_SAFE_ADDRESS ??
  "0x0000000000000000000000000000000000000000") as `0x${string}`;

// Semaphore v4 deployed contract (mainnet & Sepolia)
export const SEMAPHORE_ADDRESS =
  "0x8A1fd199516489B0Fb7153EB5f075cDAC83c693D" as `0x${string}`;

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
  {
    type: "function",
    name: "nominateCollection",
    inputs: [
      { name: "nftContract", type: "address" },
      { name: "name", type: "string" },
      { name: "reason", type: "string" },
      { name: "memberCollection", type: "address" },
      { name: "memberTokenId", type: "uint256" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "getNominations",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "tuple[]",
        components: [
          { name: "nftContract", type: "address" },
          { name: "name", type: "string" },
          { name: "nominator", type: "address" },
          { name: "reason", type: "string" },
          { name: "timestamp", type: "uint256" },
        ],
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getNominationCount",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "nominated",
    inputs: [{ name: "nftContract", type: "address" }],
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "createProposal",
    inputs: [
      { name: "title", type: "string" },
      { name: "description", type: "string" },
      { name: "nftContract", type: "address" },
      { name: "tokenId", type: "uint256" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "voteOnProposal",
    inputs: [
      { name: "proposalId", type: "uint256" },
      { name: "support", type: "bool" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "getProposals",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "tuple[]",
        components: [
          { name: "proposer", type: "address" },
          { name: "title", type: "string" },
          { name: "description", type: "string" },
          { name: "timestamp", type: "uint256" },
          { name: "yesVotes", type: "uint256" },
          { name: "noVotes", type: "uint256" },
          { name: "executed", type: "bool" },
          { name: "nftContract", type: "address" },
          { name: "tokenId", type: "uint256" },
        ],
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getProposalCount",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "nominateDelegationToken",
    inputs: [
      { name: "tokenAddress", type: "address" },
      { name: "name", type: "string" },
      { name: "symbol", type: "string" },
      { name: "reason", type: "string" },
      { name: "forRemoval", type: "bool" },
      { name: "memberCollection", type: "address" },
      { name: "memberTokenId", type: "uint256" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "getTokenNominations",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "tuple[]",
        components: [
          { name: "tokenAddress", type: "address" },
          { name: "name", type: "string" },
          { name: "symbol", type: "string" },
          { name: "nominator", type: "address" },
          { name: "reason", type: "string" },
          { name: "timestamp", type: "uint256" },
          { name: "forRemoval", type: "bool" },
        ],
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getTokenNominationCount",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "event",
    name: "DelegationTokenNominated",
    inputs: [
      { name: "tokenAddress", type: "address", indexed: true },
      { name: "name", type: "string", indexed: false },
      { name: "symbol", type: "string", indexed: false },
      { name: "nominator", type: "address", indexed: true },
      { name: "reason", type: "string", indexed: false },
      { name: "forRemoval", type: "bool", indexed: false },
    ],
  },
  {
    type: "event",
    name: "CollectionNominated",
    inputs: [
      { name: "nftContract", type: "address", indexed: true },
      { name: "name", type: "string", indexed: false },
      { name: "nominator", type: "address", indexed: true },
      { name: "reason", type: "string", indexed: false },
    ],
  },
  {
    type: "event",
    name: "ProposalCreated",
    inputs: [
      { name: "proposalId", type: "uint256", indexed: true },
      { name: "proposer", type: "address", indexed: true },
      { name: "title", type: "string", indexed: false },
    ],
  },
  {
    type: "event",
    name: "ProposalVoted",
    inputs: [
      { name: "proposalId", type: "uint256", indexed: true },
      { name: "voter", type: "address", indexed: true },
      { name: "support", type: "bool", indexed: false },
    ],
  },
  {
    type: "function",
    name: "createElectionV3",
    inputs: [{ name: "nftContract", type: "address" }],
    outputs: [{ name: "", type: "address" }],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "openElectionVoting",
    inputs: [
      { name: "election", type: "address" },
      { name: "eligibilityRoot", type: "uint256" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "semaphoreVerifier",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
  },
  // ── Allocation functions ──
  {
    type: "function",
    name: "allocationContracts",
    inputs: [{ name: "nftContract", type: "address" }],
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "createAllocation",
    inputs: [{ name: "nftContract", type: "address" }],
    outputs: [{ name: "", type: "address" }],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "updateAllocationRoot",
    inputs: [
      { name: "nftContract", type: "address" },
      { name: "newRoot", type: "uint256" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "event",
    name: "AllocationCreated",
    inputs: [
      { name: "nftContract", type: "address", indexed: true },
      { name: "allocation", type: "address", indexed: false },
    ],
  },
  {
    type: "event",
    name: "AllocationRootUpdated",
    inputs: [
      { name: "nftContract", type: "address", indexed: true },
      { name: "newRoot", type: "uint256", indexed: false },
    ],
  },
] as const;

export const SENATE_ALLOCATION_ABI = [
  // Custom errors for better diagnostics
  { type: "error", name: "Semaphore__InvalidProof", inputs: [] },
  { type: "error", name: "InvalidProof", inputs: [] },
  { type: "error", name: "InvalidMerkleTreeRoot", inputs: [] },
  { type: "error", name: "NullifierAlreadyUsed", inputs: [] },
  { type: "error", name: "InvalidCandidate", inputs: [] },
  { type: "error", name: "SameCandidate", inputs: [] },
  { type: "error", name: "NoExistingVote", inputs: [] },
  { type: "error", name: "NotAuthorized", inputs: [] },
  {
    type: "function",
    name: "nftContract",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "eligibilityRoot",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "totalVotes",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "nullifierToCandidate",
    inputs: [{ name: "nullifier", type: "uint256" }],
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
    name: "getCurrentSenators",
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
    name: "allocateVote",
    inputs: [
      {
        name: "proof",
        type: "tuple",
        components: [
          { name: "merkleTreeDepth", type: "uint256" },
          { name: "merkleTreeRoot", type: "uint256" },
          { name: "nullifier", type: "uint256" },
          { name: "message", type: "uint256" },
          { name: "scope", type: "uint256" },
          { name: "points", type: "uint256[8]" },
        ],
      },
      { name: "comment", type: "string" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "withdrawVote",
    inputs: [
      {
        name: "proof",
        type: "tuple",
        components: [
          { name: "merkleTreeDepth", type: "uint256" },
          { name: "merkleTreeRoot", type: "uint256" },
          { name: "nullifier", type: "uint256" },
          { name: "message", type: "uint256" },
          { name: "scope", type: "uint256" },
          { name: "points", type: "uint256[8]" },
        ],
      },
    ],
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
    name: "VoteAllocated",
    inputs: [
      { name: "nullifier", type: "uint256", indexed: true },
      { name: "candidateIndex", type: "uint256", indexed: false },
      { name: "comment", type: "string", indexed: false },
    ],
  },
  {
    type: "event",
    name: "VoteReallocated",
    inputs: [
      { name: "nullifier", type: "uint256", indexed: true },
      { name: "oldCandidateIndex", type: "uint256", indexed: false },
      { name: "newCandidateIndex", type: "uint256", indexed: false },
      { name: "comment", type: "string", indexed: false },
    ],
  },
  {
    type: "event",
    name: "VoteWithdrawn",
    inputs: [
      { name: "nullifier", type: "uint256", indexed: true },
      { name: "oldCandidateIndex", type: "uint256", indexed: false },
    ],
  },
  {
    type: "event",
    name: "SenatorsChanged",
    inputs: [
      { name: "newSenators", type: "address[2]", indexed: false },
    ],
  },
  {
    type: "event",
    name: "EligibilityRootUpdated",
    inputs: [
      { name: "newRoot", type: "uint256", indexed: false },
    ],
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

export const SENATE_ELECTION_V2_ABI = [
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
    name: "voterRegistrationEndTime",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "groupId",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "totalVotes",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "hasRegistered",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [{ name: "", type: "bool" }],
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
    name: "registerVoter",
    inputs: [
      { name: "tokenId", type: "uint256" },
      { name: "identityCommitment", type: "uint256" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "openVoting",
    inputs: [],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "castAnonymousVote",
    inputs: [
      {
        name: "proof",
        type: "tuple",
        components: [
          { name: "merkleTreeDepth", type: "uint256" },
          { name: "merkleTreeRoot", type: "uint256" },
          { name: "nullifier", type: "uint256" },
          { name: "message", type: "uint256" },
          { name: "scope", type: "uint256" },
          { name: "points", type: "uint256[8]" },
        ],
      },
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
    name: "VoterRegistrationOpened",
    inputs: [
      { name: "endTime", type: "uint256", indexed: false },
      { name: "groupId", type: "uint256", indexed: false },
    ],
  },
  {
    type: "event",
    name: "VoterRegistered",
    inputs: [{ name: "tokenId", type: "uint256", indexed: false }],
  },
  {
    type: "event",
    name: "VotingOpened",
    inputs: [{ name: "endTime", type: "uint256", indexed: false }],
  },
  {
    type: "event",
    name: "AnonymousVoteCast",
    inputs: [
      { name: "nullifier", type: "uint256", indexed: true },
      { name: "candidateIndex", type: "uint256", indexed: false },
      { name: "comment", type: "string", indexed: false },
    ],
  },
  {
    type: "event",
    name: "ElectionFinalized",
    inputs: [{ name: "winners", type: "address[2]", indexed: false }],
  },
] as const;

export const SENATE_ELECTION_V3_ABI = [
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
    name: "commitmentDeadline",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "eligibilityRoot",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "totalVotes",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "usedNullifiers",
    inputs: [{ name: "nullifier", type: "uint256" }],
    outputs: [{ name: "", type: "bool" }],
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
    name: "castAnonymousVote",
    inputs: [
      {
        name: "proof",
        type: "tuple",
        components: [
          { name: "merkleTreeDepth", type: "uint256" },
          { name: "merkleTreeRoot", type: "uint256" },
          { name: "nullifier", type: "uint256" },
          { name: "message", type: "uint256" },
          { name: "scope", type: "uint256" },
          { name: "points", type: "uint256[8]" },
        ],
      },
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
    name: "CommitmentCollectionOpened",
    inputs: [{ name: "deadline", type: "uint256", indexed: false }],
  },
  {
    type: "event",
    name: "VotingOpened",
    inputs: [
      { name: "endTime", type: "uint256", indexed: false },
      { name: "eligibilityRoot", type: "uint256", indexed: false },
    ],
  },
  {
    type: "event",
    name: "AnonymousVoteCast",
    inputs: [
      { name: "nullifier", type: "uint256", indexed: true },
      { name: "candidateIndex", type: "uint256", indexed: false },
      { name: "comment", type: "string", indexed: false },
    ],
  },
  {
    type: "event",
    name: "ElectionFinalized",
    inputs: [{ name: "winners", type: "address[2]", indexed: false }],
  },
] as const;

// OpenZeppelin Governor ABI (ENS, ARB, OP)
export const OZ_GOVERNOR_ABI = [
  {
    type: "function",
    name: "state",
    inputs: [{ name: "proposalId", type: "uint256" }],
    outputs: [{ name: "", type: "uint8" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "proposalDeadline",
    inputs: [{ name: "proposalId", type: "uint256" }],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "proposalSnapshot",
    inputs: [{ name: "proposalId", type: "uint256" }],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "proposalProposer",
    inputs: [{ name: "proposalId", type: "uint256" }],
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "hasVoted",
    inputs: [
      { name: "proposalId", type: "uint256" },
      { name: "account", type: "address" },
    ],
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getVotes",
    inputs: [
      { name: "account", type: "address" },
      { name: "timepoint", type: "uint256" },
    ],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "proposalVotes",
    inputs: [{ name: "proposalId", type: "uint256" }],
    outputs: [
      { name: "againstVotes", type: "uint256" },
      { name: "forVotes", type: "uint256" },
      { name: "abstainVotes", type: "uint256" },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "castVote",
    inputs: [
      { name: "proposalId", type: "uint256" },
      { name: "support", type: "uint8" },
    ],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "castVoteWithReason",
    inputs: [
      { name: "proposalId", type: "uint256" },
      { name: "support", type: "uint8" },
      { name: "reason", type: "string" },
    ],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "nonpayable",
  },
] as const;

// GovernorBravo ABI (Uniswap)
export const GOVERNOR_BRAVO_ABI = [
  {
    type: "function",
    name: "state",
    inputs: [{ name: "proposalId", type: "uint256" }],
    outputs: [{ name: "", type: "uint8" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "proposals",
    inputs: [{ name: "", type: "uint256" }],
    outputs: [
      { name: "id", type: "uint256" },
      { name: "proposer", type: "address" },
      { name: "eta", type: "uint256" },
      { name: "startBlock", type: "uint256" },
      { name: "endBlock", type: "uint256" },
      { name: "forVotes", type: "uint256" },
      { name: "againstVotes", type: "uint256" },
      { name: "abstainVotes", type: "uint256" },
      { name: "canceled", type: "bool" },
      { name: "executed", type: "bool" },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getReceipt",
    inputs: [
      { name: "proposalId", type: "uint256" },
      { name: "voter", type: "address" },
    ],
    outputs: [
      {
        name: "",
        type: "tuple",
        components: [
          { name: "hasVoted", type: "bool" },
          { name: "support", type: "uint8" },
          { name: "votes", type: "uint96" },
        ],
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "castVote",
    inputs: [
      { name: "proposalId", type: "uint256" },
      { name: "support", type: "uint8" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "castVoteWithReason",
    inputs: [
      { name: "proposalId", type: "uint256" },
      { name: "support", type: "uint8" },
      { name: "reason", type: "string" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
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
  // UNI, COMP, and other pre-ERC20Votes tokens use getCurrentVotes
  {
    type: "function",
    name: "getCurrentVotes",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint96" }],
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
