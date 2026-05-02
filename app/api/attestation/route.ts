import { NextResponse } from "next/server";
import {
  encodeAbiParameters,
  getAddress,
  isAddress,
  keccak256,
  parseAbiParameters,
  toBytes
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { randomBytes } from "crypto";
import { attestationLimiter } from "@/lib/ratelimit";

export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for") ?? "anonymous";
  const { success } = await attestationLimiter.limit(ip);

  if (!success) {
    return NextResponse.json(
      { error: "Rate limit exceeded. Please try again later." },
      { status: 429 }
    );
  }

  const body = await request.json().catch(() => null);

  const {
    scoredWallet,
    score,
    category,
    scoreHash,
    version,
    payer,
    contractAddress,
    chainId
  } = body || {};

  if (!isAddress(scoredWallet) || !isAddress(payer) || !isAddress(contractAddress)) {
    return NextResponse.json({ error: "Invalid address" }, { status: 400 });
  }

  if (!Number.isInteger(score) || score < 0 || score > 1000) {
    return NextResponse.json({ error: "Invalid score" }, { status: 400 });
  }

  if (typeof category !== "string" || category.length === 0 || category.length > 40) {
    return NextResponse.json({ error: "Invalid category" }, { status: 400 });
  }

  if (typeof scoreHash !== "string" || !scoreHash.startsWith("0x") || scoreHash.length !== 66) {
    return NextResponse.json({ error: "Invalid scoreHash" }, { status: 400 });
  }

  if (typeof version !== "string" || version.length === 0) {
    return NextResponse.json({ error: "Invalid version" }, { status: 400 });
  }

  if (typeof chainId !== "number" || !Number.isInteger(chainId)) {
    return NextResponse.json({ error: "Invalid chainId" }, { status: 400 });
  }

  if (!process.env.ATTESTER_PRIVATE_KEY) {
    return NextResponse.json({ error: "Missing ATTESTER_PRIVATE_KEY" }, { status: 500 });
  }

  const deadline = Math.floor(Date.now() / 1000) + 15 * 60;
  const nonce = `0x${randomBytes(32).toString("hex")}` as `0x${string}`;

  const account = privateKeyToAccount(process.env.ATTESTER_PRIVATE_KEY as `0x${string}`);

  const digest = keccak256(
    encodeAbiParameters(
      parseAbiParameters(
        "address,uint256,address,address,uint256,bytes32,bytes32,bytes32,uint256,bytes32"
      ),
      [
        getAddress(contractAddress),
        BigInt(chainId),
        getAddress(payer),
        getAddress(scoredWallet),
        BigInt(score),
        keccak256(toBytes(category)),
        scoreHash as `0x${string}`,
        keccak256(toBytes(version)),
        BigInt(deadline),
        nonce
      ]
    )
  );

  const signature = await account.signMessage({ message: { raw: digest } });

  return NextResponse.json({
    deadline,
    nonce,
    signature,
    signer: account.address
  });
}