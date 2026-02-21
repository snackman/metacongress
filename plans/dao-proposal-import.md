# Plan: Import DAO Proposals for Meta Senate Voting

## Current Architecture Summary

The Meta Senate is a meta-governance system where 4 NFT communities (CryptoPunks, BAYC, Pudgy Penguins, Bufficorn Buidl Brigade) each elect 2 senators via on-chain elections. Senators are added as owners to a Gnosis Safe multisig via a SenateSafeModule.

5 DAO tokens (SPORK, ENS, UNI, ARB, OP) have their voting power delegated to the Senate Safe. The stated intent: "Elected senators use the Meta Senate multisig to vote on DAO proposals, representing the collective will of NFT communities."

**The critical missing piece:** The system collects delegated voting power but has **no mechanism** for senators to discover external DAO proposals or exercise that voting power.

## DAO Governance Systems by Token

| Token | Chain | Governor Type | Governor Address | Proposal Source |
|-------|-------|--------------|-----------------|-----------------|
| ENS | Ethereum (1) | OZ Governor (GovernorCompatibilityBravo) | `0x323A76393544d5ecca80cd6ef2A560C6a395b7E3` | On-chain Governor |
| UNI | Ethereum (1) | GovernorBravo (Compound-style) | `0x408ED6354d4973f66138C91495F2f2FCbd8724C3` | On-chain Governor |
| ARB | Arbitrum (42161) | L2ArbitrumGovernor (OZ Governor variant) | TBD (Core + Treasury Governors) | On-chain Governor |
| OP | Optimism (10) | Agora Governor (OZ Governor variant) | `0xcDF27F107725988f2261Ce2256bDfCdE8B382B10` | On-chain Governor |
| SPORK | Polygon (137) | Snapshot (off-chain) | N/A | Snapshot GraphQL API (`sporkdao.eth`) |

---

## Implementation Plan

### Phase 1: Data Model and Configuration

#### 1A. Extend `DAO_TOKENS` in `src/lib/constants.ts`

Add governance metadata to each token entry:

```typescript
governance: {
  type: "governor" | "snapshot",
  governorAddress?: `0x${string}`,
  governorType?: "ozGovernor" | "governorBravo",
  snapshotSpace?: string,
}
```

#### 1B. Define TypeScript types (`src/lib/types.ts`)

```typescript
export interface ExternalProposal {
  daoName: string;
  daoSymbol: string;
  daoLogo: string;
  chain: string;
  governorAddress: string;
  proposalId: string;
  title: string;
  description: string;
  proposer: string;
  startTimestamp?: number;
  endTimestamp?: number;
  state: ProposalState;
  forVotes: string;
  againstVotes: string;
  abstainVotes: string;
  choices?: string[];           // for Snapshot multi-choice
  externalUrl: string;          // link to Tally/Agora/Snapshot
  senateVotingPower: string;
  senateHasVoted: boolean;
}
```

### Phase 2: Proposal Fetching — API Routes

#### 2A. `src/app/api/proposals/external/route.ts`

Aggregates proposals from all DAOs. Two fetching strategies:

**Governor-based DAOs (ENS, UNI, ARB, OP):**
- Primary: **Tally GraphQL API** (`https://api.tally.xyz/query`) — indexes all major Governor contracts, unified API
- Requires `TALLY_API_KEY` env var (free tier available)
- Fallback: read directly from Governor contracts on-chain via Alchemy RPCs

**Snapshot-based DAOs (SporkDAO):**
- **Snapshot GraphQL API** (`https://hub.snapshot.org/graphql`)
- Query proposals for `sporkdao.eth` space
- No API key required

#### 2B. `src/app/api/proposals/voting-power/route.ts`

For each Governor, check:
- `governor.getVotes(senateSafe, proposalSnapshot)` — Senate's voting power at snapshot
- `governor.hasVoted(proposalId, senateSafe)` — whether Senate already voted

#### 2C. Environment variables

Add `TALLY_API_KEY` to `.env.example`.

### Phase 3: Governor Contract ABIs

Add to `src/lib/contracts.ts`:
- **OZ Governor ABI** — `state`, `proposalDeadline`, `proposalSnapshot`, `hasVoted`, `getVotes`, `castVote`, `castVoteWithReason`
- **GovernorBravo ABI** — `state`, `proposals`, `castVote`, `getReceipt` (for UNI)

### Phase 4: Frontend — Hooks

#### 4A. `src/hooks/useExternalProposals.ts`

Fetches from the aggregation API route with filters (by DAO, by state). Refreshes every 1-2 minutes.

#### 4B. `src/hooks/useGovernorVote.ts`

Reads vote status and prepares vote transactions. Encodes `castVoteWithReason` calldata for the Safe.

### Phase 5: Vote Relay Mechanism

#### Approach A: Safe Transaction Queue (Recommended MVP)

1. Senator views an active DAO proposal on `/senate/proposals`
2. Senator clicks "Vote For/Against/Abstain"
3. This creates a **Safe transaction proposal** encoding `Governor.castVoteWithReason(proposalId, support, reason)`
4. Other senators confirm in Safe UI (or via Meta Senate UI with Safe SDK integration)
5. Once threshold reached, transaction executes and vote is cast on-chain

Uses Safe Transaction Service API or Safe{Core} SDK.

#### Approach B: On-chain MetaGovernance Contract (Future)

A `MetaGovernance.sol` contract that:
1. Records senator vote intentions on-chain
2. When majority threshold reached, auto-executes the vote on the target Governor via `SenateSafeModule.execTransactionFromModule()`
3. Handles cross-chain voting via bridge for ARB/OP proposals

### Phase 6: Frontend — Pages and Components

#### 6A. Redesign `/senate/proposals` page

Add tabs:
- **Tab 1: DAO Proposals** (new) — imported from external DAOs
- **Tab 2: Signaling Proposals** (existing) — internal signaling proposals

#### 6B. `src/components/senate/ExternalProposalCard.tsx`

Shows: DAO logo + chain badge, title, truncated description, vote tallies, Senate voting power, time remaining, vote buttons (senators only), external link to Tally/Agora/Snapshot.

#### 6C. `src/components/senate/ProposalFilters.tsx`

Filter by DAO, filter by state (Active/Pending/Closed), sort by deadline.

### Phase 7: Cross-Chain Voting

The Senate Safe is on Ethereum mainnet. Voting on ARB/OP proposals requires cross-chain execution.

**Options:**
1. **Deploy Safe on each chain** (recommended for simplicity) — same owners, senators sign on each chain
2. **Cross-chain bridge** — relay vote txs from mainnet Safe to L2 Governors via native L2 bridges
3. **Tally direct delegation** — if Senate holds tokens on L2, vote directly

**Recommendation:** Focus on same-chain (ENS + UNI) first, add L2 support later.

### Phase 8: Snapshot Voting for SporkDAO

Snapshot votes are off-chain (EIP-712 signatures). The Safe needs **EIP-1271** (contract signature validation) to sign Snapshot votes. Use `snapshot.js` SDK with contract wallet support.

---

## Implementation Sequence

### Sprint 1 — Foundation
1. Extend `constants.ts` with governance metadata
2. Create `src/lib/types.ts` with `ExternalProposal` type
3. Add Governor ABIs to `contracts.ts`
4. Implement `/api/proposals/external` route (Tally + Snapshot fetching)
5. Implement `useExternalProposals` hook

### Sprint 2 — Display
6. Create `ExternalProposalCard` component
7. Create `ProposalFilters` component
8. Redesign `/senate/proposals` with tabs
9. Add voting power display per proposal
10. Add external links to Tally/Agora/Snapshot

### Sprint 3 — Voting (Ethereum)
11. Implement `useGovernorVote` hook
12. Create vote relay API route for Safe transaction proposals
13. Add Safe SDK integration
14. Implement senator vote UI for ENS and UNI proposals
15. Test end-to-end on testnet

### Sprint 4 — Cross-chain + Snapshot
16. Add Snapshot voting for SporkDAO
17. Evaluate cross-chain strategy for ARB and OP
18. Deploy Safe on L2 chains if needed
19. Implement cross-chain vote relay

### Sprint 5 — On-chain Meta-governance (Optional)
20. Design and implement `MetaGovernance.sol`
21. Deploy and integrate with frontend
22. Enable on-chain senator vote signaling with auto-execution

---

## Key Decision Points

1. **On-chain vs off-chain senator votes?** Recommend starting off-chain (API/Safe TX queue) for speed, migrate to on-chain `MetaGovernance.sol` later.
2. **Cross-chain: bridge vs multi-Safe?** Recommend multi-Safe for simplicity.
3. **Auto-execute on majority?** Recommend manual execution for safety initially, auto-execute as future enhancement.

## Dependencies and Risks

- Tally API key required (free tier available)
- Safe Transaction Service API access
- Alchemy API already configured for all chains
- Governor interfaces vary slightly (GovernorBravo vs OZ Governor)
- Snapshot voting via contract wallets has EIP-1271 nuances
- Rate limits on Tally/Snapshot APIs may need caching
- Cross-chain voting adds significant complexity — defer to later sprint

## Critical Files

- `src/lib/constants.ts` — add governance metadata to DAO tokens
- `src/lib/contracts.ts` — add Governor ABIs
- `src/app/senate/proposals/page.tsx` — redesign with tabs
- `src/hooks/useProposals.ts` — pattern to follow for new hooks
- `src/app/api/allocation/[address]/relay/route.ts` — existing relay pattern to reference
