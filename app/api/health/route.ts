import { NextResponse } from "next/server";
import { getApplePassReadiness } from "@/lib/apple-pass-readiness";
import { prisma } from "@/lib/db";
import { getGoogleWalletReadiness } from "@/lib/google-wallet-readiness";

export const runtime = "nodejs";

export async function GET() {
  await prisma.$queryRaw`SELECT 1`;
  const [applePass, googleWallet] = await Promise.all([getApplePassReadiness(), getGoogleWalletReadiness()]);

  const ok = applePass.ok && googleWallet.ok;

  return NextResponse.json({
    applePass,
    googleWallet,
    database: "ok",
    status: ok ? "ok" : "degraded",
  });
}
