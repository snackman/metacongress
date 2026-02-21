import { Alchemy, Network } from "alchemy-sdk";

const settings = {
  apiKey: process.env.NEXT_PUBLIC_ALCHEMY_API_KEY ?? "",
  network: Network.ETH_MAINNET,
};

export const alchemy = new Alchemy(settings);

export async function getNFTsForOwner(
  ownerAddress: string,
  contractAddress: string
) {
  const nfts = await alchemy.nft.getNftsForOwner(ownerAddress, {
    contractAddresses: [contractAddress],
  });
  return nfts.ownedNfts;
}

export async function getNFTMetadata(
  contractAddress: string,
  tokenId: string
) {
  return alchemy.nft.getNftMetadata(contractAddress, tokenId);
}
