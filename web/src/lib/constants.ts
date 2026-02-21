export const SUPPORTED_COLLECTIONS = [
  {
    slug: "bayc",
    name: "Bored Ape Yacht Club",
    address: "0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D" as `0x${string}`,
  },
  {
    slug: "nouns",
    name: "Nouns",
    address: "0x9C8fF314C9Bc7F6e59A9d9225Fb22946427eDC03" as `0x${string}`,
  },
  {
    slug: "pudgy-penguins",
    name: "Pudgy Penguins",
    address: "0xBd3531dA5CF5857e7CfAA92426877b022e612cf8" as `0x${string}`,
  },
  {
    slug: "milady",
    name: "Milady Maker",
    address: "0x5Af0D9827E0c53E4799BB226655A1de152A425a5" as `0x${string}`,
  },
  {
    slug: "azuki",
    name: "Azuki",
    address: "0xED5AF388653567Af2F388E6224dC7C4b3241C544" as `0x${string}`,
  },
] as const;

export const DAO_TOKENS = [
  {
    name: "ENS",
    symbol: "ENS",
    address: "0xC18360217D8F7Ab5e7c516566761Ea12Ce7F9D72" as `0x${string}`,
    chain: "ethereum" as const,
    logo: "/tokens/ens.svg",
  },
  {
    name: "Uniswap",
    symbol: "UNI",
    address: "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984" as `0x${string}`,
    chain: "ethereum" as const,
    logo: "/tokens/uni.svg",
  },
  {
    name: "Arbitrum",
    symbol: "ARB",
    address: "0x912CE59144191C1204E64559FE8253a0e49E6548" as `0x${string}`,
    chain: "arbitrum" as const,
    logo: "/tokens/arb.svg",
  },
  {
    name: "Optimism",
    symbol: "OP",
    address: "0x4200000000000000000000000000000000000042" as `0x${string}`,
    chain: "optimism" as const,
    logo: "/tokens/op.svg",
  },
] as const;

export function getCollectionBySlug(slug: string) {
  return SUPPORTED_COLLECTIONS.find((c) => c.slug === slug);
}

export function getCollectionByAddress(address: string) {
  return SUPPORTED_COLLECTIONS.find(
    (c) => c.address.toLowerCase() === address.toLowerCase()
  );
}
