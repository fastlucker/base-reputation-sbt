import { redis } from "@/lib/redis";

export type BreakdownData = Record<string, number | string>;

export type LeaderboardEntry = {
  wallet: string;
  score: number;
  breakdown?: BreakdownData;
};

export async function addScore(
  wallet: string,
  score: number,
  breakdown?: BreakdownData
) {
  await redis.zadd("leaderboard", {
    score,
    member: wallet,
  });

  if (breakdown) {
await redis.hset("leaderboard:breakdowns", {
  [wallet]: JSON.stringify(breakdown)
});
  }
}

export async function getTopScores(limit = 20) {
  const raw = await redis.zrange("leaderboard", 0, limit - 1, {
    rev: true,
    withScores: true,
  });

  const entries: LeaderboardEntry[] = [];

  for (let i = 0; i < raw.length; i += 2) {
    const wallet = String(raw[i]);
    const score = Number(raw[i + 1]);

    const breakdownRaw = await redis.hget(
      "leaderboard:breakdowns",
      wallet
    );

let breakdown: BreakdownData | undefined = undefined;

if (breakdownRaw) {
  if (typeof breakdownRaw === "string") {
    try {
      breakdown = JSON.parse(breakdownRaw);
    } catch {
      breakdown = undefined;
    }
  } else if (typeof breakdownRaw === "object") {
    breakdown = breakdownRaw as BreakdownData;
  }
}

    entries.push({
      wallet,
      score,
      breakdown,
    });
  }

  return entries;
}

export async function getAllLeaderboardEntries() {
  const raw = await redis.zrange("leaderboard", 0, -1, {
    rev: true,
    withScores: true,
  });

  const entries: LeaderboardEntry[] = [];

  for (let i = 0; i < raw.length; i += 2) {
    const wallet = String(raw[i]);
    const score = Number(raw[i + 1]);

    const breakdownRaw = await redis.hget(
      "leaderboard:breakdowns",
      wallet
    );

let breakdown: BreakdownData | undefined = undefined;

if (breakdownRaw) {
  if (typeof breakdownRaw === "string") {
    try {
      breakdown = JSON.parse(breakdownRaw);
    } catch {
      breakdown = undefined;
    }
  } else if (typeof breakdownRaw === "object") {
    breakdown = breakdownRaw as BreakdownData;
  }
}

    entries.push({
      wallet,
      score,
      breakdown,
    });
  }

  return entries;
}

export function calculatePercentile(
  value: number,
  allValues: number[]
) {
  if (allValues.length === 0) {
    return null;
  }

  const lower = allValues.filter((v) => v < value).length;

  const percentile = (lower / allValues.length) * 100;

  const topPercent = Math.max(
    0.1,
    Number((100 - percentile).toFixed(1))
  );

  return {
    percentile,
    topPercent,
    label: `Top ${topPercent}%`,
  };
}