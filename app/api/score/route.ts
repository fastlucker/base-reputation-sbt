import { addScore } from "@/lib/leaderboard";
import { scoreLimiter } from "@/lib/ratelimit";
import { NextResponse } from "next/server";
import { getAddress, isAddress, keccak256, stringToBytes } from "viem";

const VERSION = "base-reputation-v0.4";

type AlchemyTransfer = {
  blockNum: string;
  hash: string;
  from: string;
  to: string | null;
  value: number | null;
  asset: string | null;
  category: string;
  metadata?: {
    blockTimestamp?: string;
  };
};

function getCategory(score: number) {
  if (score < 100) return "Noob";
  if (score < 250) return "Explorer";
  if (score < 450) return "Grinder";
  if (score < 650) return "Base Native";
  if (score < 800) return "Power User";
  if (score < 900) return "Elite";
  return "Onchain Legend";
}

async function fetchAlchemyTransfers(wallet: string) {
  const apiKey = process.env.ALCHEMY_API_KEY;
  if (!apiKey) throw new Error("Missing ALCHEMY_API_KEY in env");

  const url = `https://base-mainnet.g.alchemy.com/v2/${apiKey}`;

  const allTransfers: AlchemyTransfer[] = [];
  let pageKey: string | undefined;

  do {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        id: 1,
        jsonrpc: "2.0",
        method: "alchemy_getAssetTransfers",
        params: [
          {
            fromBlock: "0x0",
            toBlock: "latest",
            fromAddress: wallet,
            category: ["external", "erc20", "erc721", "erc1155"],
            withMetadata: true,
            excludeZeroValue: false,
            maxCount: "0x3e8",
            order: "asc",
            ...(pageKey ? { pageKey } : {})
          }
        ]
      })
    });

    const data = await response.json();
    if (data.error) throw new Error(data.error.message || "Alchemy API error");

    allTransfers.push(...(data.result.transfers as AlchemyTransfer[]));
    pageKey = data.result.pageKey;
  } while (pageKey && allTransfers.length < 10000);

  return allTransfers;
}

function uniquePeriodCounts(transfers: AlchemyTransfer[]) {
  const days = new Set<string>();
  const weeks = new Set<string>();
  const months = new Set<string>();

  for (const tx of transfers) {
    const timestamp = tx.metadata?.blockTimestamp;
    if (!timestamp) continue;

    const date = new Date(timestamp);
    const year = date.getUTCFullYear();
    const month = `${year}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
    const day = date.toISOString().slice(0, 10);

    const startOfYear = Date.UTC(year, 0, 1);
    const currentDay = Date.UTC(year, date.getUTCMonth(), date.getUTCDate());
    const week = Math.ceil(((currentDay - startOfYear) / 86400000 + 1) / 7);

    days.add(day);
    weeks.add(`${year}-W${week}`);
    months.add(month);
  }

  return {
    uniqueDays: days.size,
    uniqueWeeks: weeks.size,
    uniqueMonths: months.size
  };
}

function calculateWalletAgeDays(transfers: AlchemyTransfer[]) {
  const firstTimestamp = transfers[0]?.metadata?.blockTimestamp;
  if (!firstTimestamp) return 0;

  const first = new Date(firstTimestamp).getTime();
  const now = Date.now();

  return Math.max(0, Math.floor((now - first) / 86400000));
}

function calculateNativeVolumeEth(transfers: AlchemyTransfer[]) {
  return transfers
    .filter((tx) => tx.category === "external" && tx.asset === "ETH")
    .reduce((sum, tx) => sum + Number(tx.value || 0), 0);
}

function calculateScore(transfers: AlchemyTransfer[]) {
  const uniqueTxHashes = new Set(transfers.map((tx) => tx.hash));

  const nativeTxs = transfers.filter((tx) => tx.category === "external").length;
  const tokenTxs = transfers.filter((tx) =>
    ["erc20", "erc721", "erc1155"].includes(tx.category)
  ).length;

  const totalTxs = uniqueTxHashes.size;

  const contractInteractions = transfers.filter((tx) => tx.to).length;
  const uniqueContractInteractions = new Set(
    transfers.map((tx) => tx.to?.toLowerCase()).filter(Boolean)
  ).size;

  const walletAgeDays = calculateWalletAgeDays(transfers);
  const { uniqueDays, uniqueWeeks, uniqueMonths } = uniquePeriodCounts(transfers);

  const nativeVolumeEth = calculateNativeVolumeEth(transfers);

  const bridgeVolumeEth = transfers
    .filter(
      (tx) =>
        tx.category === "external" &&
        tx.asset === "ETH" &&
        Number(tx.value || 0) >= 0.01
    )
    .reduce((sum, tx) => sum + Number(tx.value || 0), 0);

  const walletAgeScore = Math.min(150, walletAgeDays * 0.17);
  const txScore = Math.min(150, totalTxs * 0.08);
  const contractScore = Math.min(150, contractInteractions * 0.05);
  const uniqueContractScore = Math.min(150, uniqueContractInteractions * 0.17);

  const consistencyScore = Math.min(
    150,
    uniqueDays * 0.12 + uniqueWeeks * 0.7 + uniqueMonths * 3
  );

  const volumeScore = Math.min(100, Math.log10(nativeVolumeEth + 1) * 45);
  const bridgeScore = Math.min(75, Math.log10(bridgeVolumeEth + 1) * 45);

  const baseEnsScore = 0;

  const spamRatio =
    uniqueContractInteractions === 0 ? 0 : totalTxs / uniqueContractInteractions;

  const antiSpamPenalty =
    totalTxs > 300 && spamRatio > 50 ? Math.min(100, spamRatio) : 0;

  const rawScore =
    walletAgeScore +
    txScore +
    contractScore +
    uniqueContractScore +
    consistencyScore +
    volumeScore +
    bridgeScore +
    baseEnsScore -
    antiSpamPenalty;

  const total = Math.max(0, Math.min(1000, Math.round(rawScore)));

  return {
    total,
    category: getCategory(total),
    breakdown: {
      nativeTxs,
      tokenTxs,
      totalTxs,
      contractInteractions,
      uniqueContractInteractions,
      walletAgeDays,
      uniqueDays,
      uniqueWeeks,
      uniqueMonths,
      nativeVolumeEth: Number(nativeVolumeEth.toFixed(4)),
      bridgeVolumeEth: Number(bridgeVolumeEth.toFixed(4)),
      baseEns: 0,
      antiSpamPenalty: Math.round(antiSpamPenalty)
    }
  };
}

export async function POST(request: Request) {
  try {
    const ip = request.headers.get("x-forwarded-for") ?? "anonymous";
    const { success } = await scoreLimiter.limit(ip);

    if (!success) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Please try again later." },
        { status: 429 }
      );
    }

    const body = await request.json().catch(() => null);
    const wallet = body?.wallet;

    if (!wallet || !isAddress(wallet)) {
      return NextResponse.json({ error: "Invalid EVM address" }, { status: 400 });
    }

    const scoredWallet = getAddress(wallet);
    const transfers = await fetchAlchemyTransfers(scoredWallet);
    const score = calculateScore(transfers);

    await addScore(scoredWallet, score.total);

    const scoreHash = keccak256(
      stringToBytes(JSON.stringify({ wallet: scoredWallet, score, version: VERSION }))
    );

    return NextResponse.json({
      wallet: scoredWallet,
      score: score.total,
      category: score.category,
      breakdown: score.breakdown,
      scoreHash,
      version: VERSION
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}