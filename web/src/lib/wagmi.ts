import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { mainnet, sepolia } from "wagmi/chains";
import { http } from "wagmi";

const alchemyKey = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY ?? "";

export const config = getDefaultConfig({
  appName: "Meta Senate",
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ?? "",
  chains: [mainnet, sepolia],
  transports: {
    [mainnet.id]: http(`https://eth-mainnet.g.alchemy.com/v2/${alchemyKey}`),
    [sepolia.id]: http(`https://eth-sepolia.g.alchemy.com/v2/${alchemyKey}`),
  },
  ssr: true,
});
