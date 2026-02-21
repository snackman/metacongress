export type ProposalState =
  | "pending"
  | "active"
  | "canceled"
  | "defeated"
  | "succeeded"
  | "queued"
  | "expired"
  | "executed";

export type GovernanceType = "governor" | "snapshot";
export type GovernorType = "ozGovernor" | "governorBravo";

export interface ExternalProposal {
  // Source identification
  daoName: string;
  daoSymbol: string;
  daoLogo: string;
  chain: string;
  governorAddress: string;
  governanceType: GovernanceType;

  // Proposal data
  proposalId: string;
  title: string;
  description: string;
  proposer: string;

  // Timing
  startTimestamp?: number;
  endTimestamp?: number;

  // State
  state: ProposalState;

  // Vote tallies
  forVotes: string;
  againstVotes: string;
  abstainVotes: string;

  // Snapshot-specific
  choices?: string[];
  scores?: number[];

  // Governor specifics
  governorType?: GovernorType;

  // Links
  externalUrl: string;

  // Meta Senate specific
  senateVotingPower?: string;
  senateHasVoted?: boolean;
}

export interface GovernanceConfig {
  type: GovernanceType;
  governorAddress?: `0x${string}`;
  governorType?: GovernorType;
  snapshotSpace?: string;
}
