"use client";

import { createConfig, http } from "wagmi";
import { base, baseSepolia } from "wagmi/chains";
import { baseAccount, injected } from "wagmi/connectors";

const selectedChain =
  process.env.NEXT_PUBLIC_CHAIN === "base" ? base : baseSepolia;

export const wagmiConfig = createConfig({
  chains: [selectedChain],
  connectors: [
    injected({
      target: "rabby",
    }),
    baseAccount({
      appName: "Base Reputation Score",
    }),
  ],
  transports: {
    [base.id]: http("https://mainnet.base.org"),
    [baseSepolia.id]: http("https://sepolia.base.org"),
  },
  ssr: true,
});