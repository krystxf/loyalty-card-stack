import { NextResponse } from "next/server";

import { buildCustomerResponse, getCustomerSnapshot } from "@/lib/customer-snapshot";

export const runtime = "nodejs";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const customer = await getCustomerSnapshot(id);
  if (!customer) {
    return NextResponse.json({ message: "Customer not found" }, { status: 404 });
  }
  return NextResponse.json(buildCustomerResponse(customer));
}
