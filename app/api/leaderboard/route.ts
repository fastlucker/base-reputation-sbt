import { NextResponse } from "next/server";
import { getTopScores } from "@/lib/leaderboard";

export async function GET() {
  const leaderboard = await getTopScores(20);
  return NextResponse.json({ leaderboard });
}