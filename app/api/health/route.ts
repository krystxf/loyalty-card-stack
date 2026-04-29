import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

import { getApplePassReadiness } from "@/lib/apple-pass-readiness";

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
