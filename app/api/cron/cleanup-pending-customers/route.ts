import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";

export const runtime = "nodejs";

const STALE_PENDING_AGE_MS = 365 * 24 * 60 * 60 * 1000;

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const cutoff = new Date(Date.now() - STALE_PENDING_AGE_MS);
  const result = await prisma.customer.deleteMany({
    where: {
      state: "PENDING",
      createdAt: { lt: cutoff },
    },
  });

  return NextResponse.json({ deleted: result.count, cutoff: cutoff.toISOString() });
}
