import { NextResponse } from "next/server";
import { getApplePassReadiness } from "@/lib/apple-pass-readiness";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

export async function GET() {
  await prisma.$queryRaw`SELECT 1`;
  const applePass = await getApplePassReadiness();

  return NextResponse.json({
    applePass,
    database: "ok",
    status: applePass.ok ? "ok" : "degraded",
  });
}
