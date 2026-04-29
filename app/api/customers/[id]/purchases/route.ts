import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";
import { z } from "zod";

import { buildCustomerResponse, recordPurchase } from "@/lib/customer-snapshot";

export const runtime = "nodejs";

const purchaseBodySchema = z.object({
  count: z.number().int().positive().max(100).default(1),
});

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = purchaseBodySchema.parse(await request.json().catch(() => ({})));

  const exists = await prisma.customer.findUnique({ where: { id }, select: { id: true } });
  if (!exists) {
    return NextResponse.json({ message: "Customer not found" }, { status: 404 });
  }

  const snapshot = await recordPurchase(id, body.count);
  if (!snapshot) {
    return NextResponse.json({ message: "Customer not found" }, { status: 404 });
  }

  return NextResponse.json(buildCustomerResponse(snapshot));
}
