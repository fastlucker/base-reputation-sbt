"use client";

import { useEffect, useMemo, useState } from "react";
import { isAddress, getAddress } from "viem";

type Leader = {
  wallet: string;
  score: number;
};

const filters = [
  { label: "All", value: "all" },
  { label: "Elite+", value: "elite" },
  { label: "Legends", value: "legend" }
];

export default function LeaderboardPage() {
  const [leaders, setLeaders] = useState<Leader[]>([]);
  const [walletInput, setWalletInput] = useState("");
  const [highlightWallet, setHighlightWallet] = useState<string | null>(null);
  const [filter, setFilter] = useState("all");
  const [personalRank, setPersonalRank] = useState<number | null>(null);

  const shareUrl = useMemo(() => {
    if (typeof window === "undefined") return "";
    const url = new URL(window.location.href);
    if (highlightWallet) url.searchParams.set("wallet", highlightWallet);
    url.searchParams.set("filter", filter);
    return url.toString();
  }, [highlightWallet, filter]);

  async function loadLeaderboard(nextFilter = filter, wallet = highlightWallet) {
    const params = new URLSearchParams();
    params.set("filter", nextFilter);
    if (wallet) params.set("wallet", wallet);

    const res = await fetch(`/api/leaderboard?${params.toString()}`);
    const data = await res.json();

    setLeaders(data.leaderboard || []);
    setPersonalRank(data.personalRank || null);
  }

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const wallet = params.get("wallet");
    const urlFilter = params.get("filter") || "all";

    if (wallet && isAddress(wallet)) {
      setHighlightWallet(getAddress(wallet));
      setWalletInput(getAddress(wallet));
    }

    setFilter(urlFilter);
    loadLeaderboard(urlFilter, wallet && isAddress(wallet) ? getAddress(wallet) : null);
  }, []);

  async function applyWallet() {
    if (!isAddress(walletInput)) return;

    const normalized = getAddress(walletInput);
    setHighlightWallet(normalized);

    const url = new URL(window.location.href);
    url.searchParams.set("wallet", normalized);
    url.searchParams.set("filter", filter);
    window.history.pushState({}, "", url.toString());

    await loadLeaderboard(filter, normalized);
  }

  async function changeFilter(nextFilter: string) {
    setFilter(nextFilter);

    const url = new URL(window.location.href);
    url.searchParams.set("filter", nextFilter);
    if (highlightWallet) url.searchParams.set("wallet", highlightWallet);
    window.history.pushState({}, "", url.toString());

    await loadLeaderboard(nextFilter, highlightWallet);
  }

  async function copyShareLink() {
    await navigator.clipboard.writeText(shareUrl);
  }

  return (
    <main className="min-h-screen px-5 py-8">
      <section className="mx-auto max-w-xl rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl">
        <a href="/" className="text-sm text-blue-300">
          ← Back to score
        </a>

        <h1 className="mt-4 text-3xl font-bold">Base Leaderboard</h1>

        <p className="mt-2 text-sm text-white/60">
          Compare wallets, highlight your rank, and share your onchain resume.
        </p>

        <div className="mt-6 space-y-3">
          <label className="text-sm font-medium text-white/80">
            Highlight a wallet
          </label>

          <input
            value={walletInput}
            onChange={(e) => setWalletInput(e.target.value)}
            placeholder="0x..."
            className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm outline-none ring-blue-500/40 placeholder:text-white/30 focus:ring-4"
          />

          <button
            onClick={applyWallet}
            className="w-full rounded-2xl bg-blue-500 px-4 py-3 text-sm font-semibold text-white"
          >
            Show my rank
          </button>
        </div>

        {personalRank && (
          <div className="mt-5 rounded-2xl border border-blue-400/40 bg-blue-500/10 p-4">
            <p className="text-sm text-blue-200">Your rank</p>
            <p className="text-3xl font-black">#{personalRank}</p>
          </div>
        )}

        <div className="mt-6 flex gap-2">
          {filters.map((item) => (
            <button
              key={item.value}
              onClick={() => changeFilter(item.value)}
              className={`flex-1 rounded-xl px-3 py-2 text-sm font-semibold ${
                filter === item.value
                  ? "bg-blue-500 text-white"
                  : "bg-white/5 text-white/60"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="mt-6 space-y-2">
          {leaders.map((leader, index) => {
            const isHighlighted =
              highlightWallet?.toLowerCase() === leader.wallet.toLowerCase();

            return (
              <div
                key={leader.wallet}
                className={`flex items-center justify-between rounded-2xl px-4 py-3 text-sm ${
                  isHighlighted
                    ? "bg-blue-500 text-white shadow-lg shadow-blue-500/20"
                    : "bg-white/5 text-white/70"
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="w-8 text-white/50">#{index + 1}</span>
                  <span className="font-medium">
                    {leader.wallet.slice(0, 6)}...{leader.wallet.slice(-4)}
                  </span>
                </div>

                <span className="font-bold">{leader.score}</span>
              </div>
            );
          })}
        </div>

        <button
          onClick={copyShareLink}
          className="mt-6 w-full rounded-2xl bg-white px-4 py-3 text-sm font-bold text-black"
        >
          Copy shareable leaderboard link
        </button>
      </section>
    </main>
  );
}