import { zeroAddress } from "viem";

export const scoreContractAddress =
  (process.env.NEXT_PUBLIC_SCORE_CONTRACT_ADDRESS as `0x${string}` | undefined) || zeroAddress;

export const MINT_PRICE_ETH = "0.0002";

export const scoreContractAbi = [
  {
    type: "function",
    name: "mintReputationScore",
    stateMutability: "payable",
inputs: [
  { name: "scoredWallet", type: "address" },
  { name: "score", type: "uint256" },
  { name: "category", type: "string" },
  { name: "scoreHash", type: "bytes32" },
  { name: "version", type: "string" },
  { name: "deadline", type: "uint256" },
  { name: "nonce", type: "bytes32" },
  { name: "signature", type: "bytes" }
],
    outputs: []
  },
  {
    type: "function",
    name: "latestTokenByWallet",
    stateMutability: "view",
    inputs: [{ name: "wallet", type: "address" }],
    outputs: [{ name: "tokenId", type: "uint256" }]
  },
  {
    type: "function",
    name: "reputations",
    stateMutability: "view",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [
      { name: "scoredWallet", type: "address" },
      { name: "score", type: "uint256" },
      { name: "category", type: "string" },
      { name: "scoreHash", type: "bytes32" },
      { name: "version", type: "string" },
      { name: "mintedAt", type: "uint256" }
    ]
  },
  {
    type: "function",
    name: "tokenURI",
    stateMutability: "view",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [{ name: "", type: "string" }]
  },
  {
    type: "event",
    name: "ReputationMinted",
    inputs: [
      { name: "tokenId", type: "uint256", indexed: true },
      { name: "owner", type: "address", indexed: true },
      { name: "scoredWallet", type: "address", indexed: true },
      { name: "score", type: "uint256", indexed: false },
      { name: "category", type: "string", indexed: false },
      { name: "scoreHash", type: "bytes32", indexed: false },
      { name: "version", type: "string", indexed: false },
      { name: "mintedAt", type: "uint256", indexed: false }
    ]
  }
] as const;