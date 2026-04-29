import { NextResponse } from "next/server";

import { buildCustomerResponse, createCustomerWithWallet } from "@/lib/customer-snapshot";

export const runtime = "nodejs";

export async function POST() {
  const created = await createCustomerWithWallet();

  if (!created) {
    return NextResponse.json({ message: "Failed to create customer" }, { status: 500 });
  }

  return NextResponse.json(buildCustomerResponse(created.snapshot), { status: 201 });
}
