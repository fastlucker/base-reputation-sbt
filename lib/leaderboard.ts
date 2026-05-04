import { redis } from "@/lib/redis";

export type LeaderboardEntry = {
  wallet: string;
  score: number;
};

export async function addScore(wallet: string, score: number) {
  await redis.zadd("leaderboard", {
    score,
    member: wallet,
  });
}

export async function getTopScores(limit = 20) {
  const raw = await redis.zrange("leaderboard", 0, limit - 1, {
    rev: true,
    withScores: true,
  });

  const entries: LeaderboardEntry[] = [];

  for (let i = 0; i < raw.length; i += 2) {
    entries.push({
      wallet: String(raw[i]),
      score: Number(raw[i + 1]),
    });
  }

  return entries;
}