import { NextResponse } from "next/server";
import { getTopScores } from "@/lib/leaderboard";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const wallet = searchParams.get("wallet")?.toLowerCase();
  const filter = searchParams.get("filter") || "all";

  const leaderboard = await getTopScores(100);

  let filtered = leaderboard;

  if (filter === "elite") {
    filtered = leaderboard.filter((entry) => entry.score >= 800);
  }

  if (filter === "legend") {
    filtered = leaderboard.filter((entry) => entry.score >= 900);
  }

  const personalRank = wallet
    ? leaderboard.findIndex((entry) => entry.wallet.toLowerCase() === wallet) + 1
    : null;

  return NextResponse.json({
    leaderboard: filtered,
    personalRank: personalRank && personalRank > 0 ? personalRank : null,
    filter
  });
}