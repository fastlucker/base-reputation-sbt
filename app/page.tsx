"use client";

import { useEffect, useMemo, useState } from "react";
import { getAddress, isAddress, parseEther } from "viem";
import { base, baseSepolia } from "wagmi/chains";
import {
  useAccount,
  useChainId,
  useConnect,
  useSwitchChain,
  useWriteContract
} from "wagmi";
import { MINT_PRICE_ETH, scoreContractAbi, scoreContractAddress } from "@/lib/contract";

type ScoreResponse = {
  wallet: `0x${string}`;
  score: number;
  category: string;
  breakdown: Record<string, number | string>;
  scoreHash: `0x${string}`;
  version: string;
};

type LeaderboardEntry = {
  wallet: string;
  score: number;
};

const categories = [
  { label: "Noob", range: "0–99" },
  { label: "Explorer", range: "100–249" },
  { label: "Grinder", range: "250–449" },
  { label: "Base Native", range: "450–649" },
  { label: "Power User", range: "650–799" },
  { label: "Elite", range: "800–899" },
  { label: "Onchain Legend", range: "900–1000" }
];

const badgeMap: Record<string, string> = {
  Noob: "🌱",
  Explorer: "🧭",
  Grinder: "⚒️",
  "Base Native": "🔵",
  "Power User": "⚡",
  Elite: "👑",
  "Onchain Legend": "🔥"
};

export default function Home() {
  const [walletInput, setWalletInput] = useState("");
  const [score, setScore] = useState<ScoreResponse | null>(null);
  const [leaders, setLeaders] = useState<LeaderboardEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isScoring, setIsScoring] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);

  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { connect, connectors, isPending: isConnecting } = useConnect();
  const { switchChainAsync } = useSwitchChain();
  const { writeContractAsync, isPending: isMinting } = useWriteContract();

  const selectedChain = process.env.NEXT_PUBLIC_CHAIN === "base" ? base : baseSepolia;

  const normalizedWallet = useMemo(() => {
    if (!isAddress(walletInput)) return null;
    return getAddress(walletInput);
  }, [walletInput]);

  const isWrongChain =
  isConnected &&
  typeof chainId !== "undefined" &&
  chainId !== 8453;

  const shareText = score
    ? `I scored ${score.score} (${score.category}) on Base.\n\nCheck your onchain resume 👇`
    : "";

  const shareUrl =
    score && typeof window !== "undefined"
      ? `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(window.location.origin)}`
      : "#";

  async function refreshLeaderboard() {
    try {
      const res = await fetch("/api/leaderboard");
      const data = await res.json();
      setLeaders(data.leaderboard || []);
    } catch {
      setLeaders([]);
    }
  }

  useEffect(() => {
    refreshLeaderboard();
  }, []);

  async function calculateScore() {
    setError(null);
    setTxHash(null);
    setScore(null);

    if (!normalizedWallet) {
      setError("Invalid EVM address.");
      return;
    }

    setIsScoring(true);

    try {
      const res = await fetch("/api/score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wallet: normalizedWallet })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error while calculating the score.");

      setScore(data);
      await refreshLeaderboard();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error.");
    } finally {
      setIsScoring(false);
    }
  }

  async function mintScore() {
    setError(null);
    setTxHash(null);

    if (!score || !address) {
      setError("Calculate your score and connect your Base smart wallet before minting.");
      return;
    }

    if (!scoreContractAddress || scoreContractAddress === "0x0000000000000000000000000000000000000000") {
      setError("Missing contract address. Set NEXT_PUBLIC_SCORE_CONTRACT_ADDRESS.");
      return;
    }

    try {
      if (window.ethereum && chainId !== selectedChain.id) {
  await window.ethereum.request({
    method: "wallet_switchEthereumChain",
    params: [{ chainId: "0x2105" }]
  });
}

      const attestationRes = await fetch("/api/attestation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scoredWallet: score.wallet,
          score: score.score,
          category: score.category,
          scoreHash: score.scoreHash,
          version: score.version,
          payer: address,
          contractAddress: scoreContractAddress,
          chainId: selectedChain.id
        })
      });

      const attestation = await attestationRes.json();
      if (!attestationRes.ok) throw new Error(attestation.error || "Attestation error.");

      const hash = await writeContractAsync({
        address: scoreContractAddress,
        abi: scoreContractAbi,
        functionName: "mintReputationScore",
        chainId: selectedChain.id,
        args: [
          score.wallet,
          BigInt(score.score),
          score.category,
          score.scoreHash,
          score.version,
          BigInt(attestation.deadline),
          attestation.nonce,
          attestation.signature
        ],
        value: parseEther(MINT_PRICE_ETH)
      });

      setTxHash(hash);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Transaction rejected or failed.");
    }
  }

  return (
    <main className="min-h-screen px-5 py-8">
      <section className="mx-auto max-w-xl rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl">
        <p className="mb-3 text-sm font-medium text-blue-300">Base App Mini App MVP</p>

        <h1 className="text-3xl font-bold tracking-tight">Base Reputation Score</h1>

        <p className="mt-3 text-sm leading-6 text-white/70">
          Your onchain resume on Base. Analyze any wallet, get a reputation score, and mint it onchain.
        </p>

        <p className="mt-2 text-xs text-white/50">
          Your activity. Your reputation. Your proof.
        </p>

        <div className="mt-6 space-y-3">
          <label className="text-sm font-medium text-white/80">Wallet address to evaluate</label>

          <input
            value={walletInput}
            onChange={(e) => setWalletInput(e.target.value)}
            placeholder="0x..."
            className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm outline-none ring-blue-500/40 placeholder:text-white/30 focus:ring-4"
          />

          <button
            onClick={calculateScore}
            disabled={isScoring}
            className="w-full rounded-2xl bg-blue-500 px-4 py-3 font-semibold text-white disabled:opacity-50"
          >
            {isScoring ? "Calculating..." : "Calculate score"}
          </button>
        </div>

        {score && (
          <div className="mt-6 rounded-3xl border border-white/10 bg-black/30 p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm text-white/60">Score</p>
                <p className="text-5xl font-black">{score.score}</p>
                <p className="mt-2 inline-flex items-center gap-2 rounded-full bg-blue-500/20 px-3 py-1 text-sm font-semibold text-blue-200">
                  <span>{badgeMap[score.category]}</span>
                  <span>{score.category}</span>
                </p>
              </div>

              <p className="rounded-full bg-white/10 px-3 py-1 text-xs text-white/70">{score.version}</p>
            </div>

            <a
              href={shareUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-4 inline-flex w-full items-center justify-center rounded-2xl bg-blue-500 px-4 py-3 text-sm font-semibold text-white"
            >
              Share on X
            </a>

            <div className="mt-5 rounded-2xl bg-white/5 p-3">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-white/50">
                Reputation tiers
              </p>

              <div className="grid grid-cols-1 gap-2">
                {categories.map((tier) => {
                  const isActive = tier.label === score.category;

                  return (
                    <div
                      key={tier.label}
                      className={`flex items-center justify-between rounded-xl px-3 py-2 text-sm ${
                        isActive
                          ? "bg-blue-500 text-white shadow-lg shadow-blue-500/20"
                          : "bg-black/20 text-white/50"
                      }`}
                    >
                      <span className="font-semibold">
                        {badgeMap[tier.label]} {tier.label}
                      </span>
                      <span>{tier.range}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
              {Object.entries(score.breakdown).map(([key, value]) => (
                <div key={key} className="rounded-2xl bg-white/5 p-3">
                  <p className="text-white/50">{key}</p>
                  <p className="break-words text-lg font-bold">{String(value)}</p>
                </div>
              ))}
            </div>

            <p className="mt-4 break-all text-xs text-white/40">Hash: {score.scoreHash}</p>
          </div>
        )}

        {leaders.length > 0 && (
          <div className="mt-6 rounded-3xl border border-white/10 bg-black/30 p-5">
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm font-semibold text-white/70">Leaderboard</p>
              <p className="text-xs text-white/40">Top 20</p>
            </div>

            <div className="space-y-2">
              {leaders.slice(0, 20).map((leader, index) => (
                <div
                  key={leader.wallet}
                  className="flex items-center justify-between rounded-2xl bg-white/5 px-3 py-2 text-sm"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-6 text-white/40">#{index + 1}</span>
                    <span className="font-medium text-white/80">
                      {leader.wallet.slice(0, 6)}...{leader.wallet.slice(-4)}
                    </span>
                  </div>

                  <span className="font-bold text-blue-200">{leader.score}</span>
                </div>
              ))}
            </div>

            <a
              href="/leaderboard"
              className="mt-4 inline-flex w-full items-center justify-center rounded-2xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white"
            >
              View full leaderboard
            </a>
          </div>
        )}

        <div className="mt-6 space-y-3">
          {!isConnected ? (
            <button
              onClick={() => connect({ connector: connectors[0] })}
              disabled={isConnecting || connectors.length === 0}
              className="w-full rounded-2xl border border-blue-400/50 bg-blue-400/10 px-4 py-3 font-semibold text-blue-200 disabled:opacity-50"
            >
              {isConnecting ? "Connecting..." : "Connect Base smart wallet"}
            </button>
          ) : (
            <p className="break-all rounded-2xl bg-white/5 p-3 text-xs text-white/60">
              Connected payer: {address}
            </p>
          )}

          {isWrongChain && (
            <p className="rounded-2xl bg-yellow-500/10 p-3 text-xs text-yellow-200">
              Your wallet is not on Base. We’ll ask you to switch networks before minting.
            </p>
          )}

          <button
            onClick={mintScore}
            disabled={!score || !isConnected || isMinting}
            className="w-full rounded-2xl bg-white px-4 py-3 font-bold text-black disabled:opacity-40"
          >
            {isMinting ? "Minting..." : `Mint my reputation score — ${MINT_PRICE_ETH} ETH`}
          </button>
        </div>

        {txHash && (
          <p className="mt-4 break-all rounded-2xl bg-green-500/10 p-3 text-sm text-green-200">
            Mint sent: {txHash}
          </p>
        )}

        {error && (
          <p className="mt-4 rounded-2xl bg-red-500/10 p-3 text-sm text-red-200">{error}</p>
        )}
      </section>
    </main>
  );
}