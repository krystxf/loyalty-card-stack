import { NextResponse } from "next/server";
import { z } from "zod";
import { buildCustomerResponse, recordRewardRedemption } from "@/lib/customer-snapshot";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

const redeemBodySchema = z.object({
  count: z.number().int().positive().max(100).default(1),
});

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = redeemBodySchema.parse(await request.json().catch(() => ({})));

  const exists = await prisma.customer.findUnique({ where: { id }, select: { id: true } });
  if (!exists) {
    return NextResponse.json({ message: "Customer not found" }, { status: 404 });
  }

  try {
    const snapshot = await recordRewardRedemption(id, body.count);
    if (!snapshot) {
      return NextResponse.json({ message: "Customer not found" }, { status: 404 });
    }
    return NextResponse.json(buildCustomerResponse(snapshot));
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Unable to redeem reward" },
      { status: 400 },
    );
  }
}
