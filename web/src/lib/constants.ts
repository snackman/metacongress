export const SUPPORTED_COLLECTIONS = [
  {
    slug: "cryptopunks",
    name: "CryptoPunks",
    address: "0xb47e3cd837dDF8e4c57F05d70Ab865de6e193BBB" as `0x${string}`,
    logo: "/collections/cryptopunks.png",
  },
  {
    slug: "bayc",
    name: "Bored Ape Yacht Club",
    address: "0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D" as `0x${string}`,
    logo: "/collections/bayc.png",
  },
  {
    slug: "pudgy-penguins",
    name: "Pudgy Penguins",
    address: "0xBd3531dA5CF5857e7CfAA92426877b022e612cf8" as `0x${string}`,
    logo: "/collections/pudgy-penguins.png",
  },
  {
    slug: "bufficorns",
    name: "Bufficorn Buidl Brigade",
    address: "0x1e988ba4692e52Bc50b375bcC8585b95c48AaD77" as `0x${string}`,
    logo: "/collections/bufficorns.png",
  },
] as const;

export const DAO_TOKENS = [
  {
    name: "SporkDAO",
    symbol: "SPORK",
    address: "0x9CA6a77C8B38159fd2dA9Bd25bc3E259C33F5E39" as `0x${string}`,
    chain: "polygon" as const,
    logo: "https://assets.coingecko.com/coins/images/23358/standard/sporkdao.PNG?1696522573",
  },
  {
    name: "ENS",
    symbol: "ENS",
    address: "0xC18360217D8F7Ab5e7c516566761Ea12Ce7F9D72" as `0x${string}`,
    chain: "ethereum" as const,
    logo: "/tokens/ens.png",
  },
  {
    name: "Uniswap",
    symbol: "UNI",
    address: "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984" as `0x${string}`,
    chain: "ethereum" as const,
    logo: "/tokens/uni.png",
  },
  {
    name: "Arbitrum",
    symbol: "ARB",
    address: "0x912CE59144191C1204E64559FE8253a0e49E6548" as `0x${string}`,
    chain: "arbitrum" as const,
    logo: "/tokens/arb.png",
  },
  {
    name: "Optimism",
    symbol: "OP",
    address: "0x4200000000000000000000000000000000000042" as `0x${string}`,
    chain: "optimism" as const,
    logo: "/tokens/op.png",
  },
] as const;

const CHAIN_IDS = {
  ethereum: 1,
  polygon: 137,
  arbitrum: 42161,
  optimism: 10,
} as const;

export function getChainId(chain: string): number {
  return CHAIN_IDS[chain as keyof typeof CHAIN_IDS] ?? 1;
}

export function getCollectionBySlug(slug: string) {
  return SUPPORTED_COLLECTIONS.find((c) => c.slug === slug);
}

export function getCollectionByAddress(address: string) {
  return SUPPORTED_COLLECTIONS.find(
    (c) => c.address.toLowerCase() === address.toLowerCase()
  );
}
