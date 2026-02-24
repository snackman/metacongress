import { NextRequest, NextResponse } from "next/server";
import { DAO_TOKENS } from "@/lib/constants";
import type { ExternalProposal, ProposalState } from "@/lib/types";

// ---------------------------------------------------------------------------
// In-memory cache (key -> { data, timestamp })
// ---------------------------------------------------------------------------
const cache = new Map<string, { data: ExternalProposal[]; timestamp: number }>();
const CACHE_TTL_MS = 2 * 60 * 1000; // 2 minutes

function getCached(key: string): ExternalProposal[] | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
    cache.delete(key);
    return null;
  }
  return entry.data;
}

function setCache(key: string, data: ExternalProposal[]) {
  cache.set(key, { data, timestamp: Date.now() });
}

// ---------------------------------------------------------------------------
// Chain name -> Tally EIP-155 chain id mapping
// ---------------------------------------------------------------------------
const CHAIN_TO_EIP155: Record<string, string> = {
  ethereum: "eip155:1",
  arbitrum: "eip155:42161",
  optimism: "eip155:10",
};

// ---------------------------------------------------------------------------
// Tally status -> ProposalState mapping
// ---------------------------------------------------------------------------
const TALLY_STATUS_MAP: Record<string, ProposalState> = {
  PENDING: "pending",
  ACTIVE: "active",
  CANCELED: "canceled",
  DEFEATED: "defeated",
  SUCCEEDED: "succeeded",
  QUEUED: "queued",
  EXPIRED: "expired",
  EXECUTED: "executed",
  pending: "pending",
  active: "active",
  canceled: "canceled",
  defeated: "defeated",
  succeeded: "succeeded",
  queued: "queued",
  expired: "expired",
  executed: "executed",
};

const TALLY_DAO_SLUGS: Record<string, string> = {
  ENS: "ens",
  UNI: "uniswap",
  ARB: "arbitrum",
  OP: "optimism",
};

// ---------------------------------------------------------------------------
// Tally fetcher
// ---------------------------------------------------------------------------
const TALLY_QUERY = `
query GovernorProposals($input: ProposalsInput!) {
  proposals(input: $input) {
    nodes {
      ... on Proposal {
        id
        onchainId
        status
        metadata {
          title
          description
        }
        proposer { address }
        start {
          ... on Block { timestamp }
          ... on BlocklessTimestamp { timestamp }
        }
        end {
          ... on Block { timestamp }
          ... on BlocklessTimestamp { timestamp }
        }
        voteStats {
          type
          votesCount
          votersCount
          percent
        }
        governor {
          id
          name
          chainId
        }
      }
    }
  }
}
`;

interface TallyVoteStat {
  type: string;
  votesCount: string;
  votersCount: number;
  percent: number;
}

interface TallyProposalNode {
  id: string;
  onchainId: string;
  status: string;
  metadata: { title: string; description: string };
  proposer: { address: string };
  start: { timestamp: string };
  end: { timestamp: string };
  voteStats: TallyVoteStat[];
  governor: { id: string; name: string; chainId: string };
}

async function fetchTallyProposals(): Promise<ExternalProposal[]> {
  const apiKey = process.env.TALLY_API_KEY;
  if (!apiKey) {
    console.warn("TALLY_API_KEY not set, skipping Tally proposals");
    return [];
  }

  const governorTokens = DAO_TOKENS.filter(
    (t) => t.governance.type === "governor" && "governorAddress" in t.governance
  );

  // Build a lookup from governorAddress (lowercased) to DAO_TOKENS entry
  const governorLookup = new Map(
    governorTokens.map((t) => [
      ((t.governance as { governorAddress: string }).governorAddress).toLowerCase(),
      t,
    ])
  );

  // Query each governor separately (Tally no longer supports governorId_in)
  const perGovernorFetches = governorTokens.map(async (t) => {
    const eip155 = CHAIN_TO_EIP155[t.chain];
    const addr = (t.governance as { governorAddress: string }).governorAddress;
    const governorId = `${eip155}:${addr}`;

    const res = await fetch("https://api.tally.xyz/query", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Api-Key": apiKey,
      },
      body: JSON.stringify({
        query: TALLY_QUERY,
        variables: {
          input: {
            filters: { governorId },
            page: { limit: 10 },
            sort: { isDescending: true, sortBy: "id" },
          },
        },
      }),
    });

    if (!res.ok) {
      console.error(`Tally API error for ${t.symbol}:`, res.status, await res.text());
      return [] as TallyProposalNode[];
    }

    const json = await res.json();
    if (json.errors) {
      console.error(`Tally GraphQL errors for ${t.symbol}:`, JSON.stringify(json.errors));
      return [] as TallyProposalNode[];
    }
    return (json?.data?.proposals?.nodes ?? []) as TallyProposalNode[];
  });

  const results = await Promise.all(perGovernorFetches);
  const nodes = results.flat();

  return nodes.map((node) => {
    // Governor ID format from Tally: "eip155:{chainId}:{address}"
    const govAddress = node.governor.id.split(":").pop() ?? "";
    const token = governorLookup.get(govAddress.toLowerCase());

    // Status is now a direct field
    const state: ProposalState = TALLY_STATUS_MAP[node.status] ?? "pending";

    // Extract vote stats (Tally now returns lowercase type values)
    const forStat = node.voteStats.find((v) => v.type === "for" || v.type === "FOR");
    const againstStat = node.voteStats.find((v) => v.type === "against" || v.type === "AGAINST");
    const abstainStat = node.voteStats.find((v) => v.type === "abstain" || v.type === "ABSTAIN");

    // Parse timestamps — Tally may return ISO 8601 strings or unix timestamps
    const parseTimestamp = (ts: string | undefined): number | undefined => {
      if (!ts) return undefined;
      const num = Number(ts);
      if (!isNaN(num) && num < 1e12) return num; // already unix seconds
      if (!isNaN(num) && num >= 1e12) return Math.floor(num / 1000); // unix ms
      return Math.floor(new Date(ts).getTime() / 1000); // ISO string
    };

    // Build external URL using known DAO slugs
    const daoSlug = TALLY_DAO_SLUGS[token?.symbol ?? ""] ??
      node.governor.name.toLowerCase().replace(/\s+/g, "-");
    const externalUrl = `https://www.tally.xyz/gov/${daoSlug}/proposal/${node.onchainId}`;

    return {
      daoName: token?.name ?? node.governor.name,
      daoSymbol: token?.symbol ?? "",
      daoLogo: token?.logo ?? "",
      chain: token?.chain ?? "",
      governorAddress: govAddress,
      governanceType: "governor" as const,
      governorType: (token?.governance as { governorType?: string } | undefined)?.governorType === "governorBravo" ? "governorBravo" as const : "ozGovernor" as const,
      proposalId: node.onchainId,
      title: node.metadata?.title ?? "",
      description: node.metadata?.description ?? "",
      proposer: node.proposer?.address ?? "",
      startTimestamp: parseTimestamp(node.start?.timestamp),
      endTimestamp: parseTimestamp(node.end?.timestamp),
      state,
      forVotes: forStat?.votesCount ?? "0",
      againstVotes: againstStat?.votesCount ?? "0",
      abstainVotes: abstainStat?.votesCount ?? "0",
      externalUrl,
    } satisfies ExternalProposal;
  });
}

// ---------------------------------------------------------------------------
// Snapshot fetcher
// ---------------------------------------------------------------------------
const SNAPSHOT_QUERY = `
query {
  proposals(
    where: { space: "sporkdao.eth" }
    orderBy: "created"
    orderDirection: desc
    first: 10
  ) {
    id
    title
    body
    choices
    start
    end
    state
    author
    scores
    scores_total
    space { id name }
  }
}
`;

interface SnapshotProposal {
  id: string;
  title: string;
  body: string;
  choices: string[];
  start: number;
  end: number;
  state: string;
  author: string;
  scores: number[];
  scores_total: number;
  space: { id: string; name: string };
}

async function fetchSnapshotProposals(): Promise<ExternalProposal[]> {
  const sporkToken = DAO_TOKENS.find((t) => t.symbol === "SPORK");

  const res = await fetch("https://hub.snapshot.org/graphql", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query: SNAPSHOT_QUERY }),
  });

  if (!res.ok) {
    console.error("Snapshot API error:", res.status, await res.text());
    return [];
  }

  const json = await res.json();
  const proposals: SnapshotProposal[] = json?.data?.proposals ?? [];

  // Map Snapshot state strings to our ProposalState
  const stateMap: Record<string, ProposalState> = {
    active: "active",
    closed: "executed",
    pending: "pending",
  };

  return proposals.map((p) => {
    // For standard For/Against/Abstain choices, map scores
    const forIdx = p.choices.findIndex((c) => c.toLowerCase() === "for");
    const againstIdx = p.choices.findIndex((c) => c.toLowerCase() === "against");
    const abstainIdx = p.choices.findIndex((c) => c.toLowerCase() === "abstain");

    return {
      daoName: sporkToken?.name ?? "SporkDAO",
      daoSymbol: sporkToken?.symbol ?? "SPORK",
      daoLogo: sporkToken?.logo ?? "/tokens/spork.png",
      chain: sporkToken?.chain ?? "polygon",
      governorAddress: "",
      governanceType: "snapshot" as const,
      proposalId: p.id,
      title: p.title,
      description: p.body,
      proposer: p.author,
      startTimestamp: p.start,
      endTimestamp: p.end,
      state: stateMap[p.state] ?? "active",
      forVotes: forIdx >= 0 ? String(p.scores[forIdx] ?? 0) : "0",
      againstVotes: againstIdx >= 0 ? String(p.scores[againstIdx] ?? 0) : "0",
      abstainVotes: abstainIdx >= 0 ? String(p.scores[abstainIdx] ?? 0) : "0",
      choices: p.choices,
      scores: p.scores,
      externalUrl: `https://snapshot.org/#/sporkdao.eth/proposal/${p.id}`,
    } satisfies ExternalProposal;
  });
}

// ---------------------------------------------------------------------------
// GET handler
// ---------------------------------------------------------------------------
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const daoFilter = searchParams.get("dao")?.toUpperCase();
    const stateFilter = searchParams.get("state")?.toLowerCase();

    // Build cache key from filters
    const cacheKey = `proposals:${daoFilter ?? "all"}:${stateFilter ?? "all"}`;
    const cached = getCached(cacheKey);
    if (cached) {
      return NextResponse.json({ proposals: cached });
    }

    // Fetch from both sources in parallel
    const [tallyProposals, snapshotProposals] = await Promise.all([
      fetchTallyProposals().catch((err) => {
        console.error("Tally fetch failed:", err);
        return [] as ExternalProposal[];
      }),
      fetchSnapshotProposals().catch((err) => {
        console.error("Snapshot fetch failed:", err);
        return [] as ExternalProposal[];
      }),
    ]);

    let proposals = [...tallyProposals, ...snapshotProposals];

    // Apply filters
    if (daoFilter) {
      proposals = proposals.filter((p) => p.daoSymbol.toUpperCase() === daoFilter);
    }
    if (stateFilter) {
      proposals = proposals.filter((p) => p.state === stateFilter);
    }

    // Sort: active proposals first, then by endTimestamp descending (most urgent first)
    proposals.sort((a, b) => {
      const aActive = a.state === "active" ? 0 : 1;
      const bActive = b.state === "active" ? 0 : 1;
      if (aActive !== bActive) return aActive - bActive;
      return (b.endTimestamp ?? 0) - (a.endTimestamp ?? 0);
    });

    setCache(cacheKey, proposals);
    return NextResponse.json({ proposals });
  } catch (err) {
    console.error("External proposals fetch error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
