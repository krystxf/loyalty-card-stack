import { NextResponse } from "next/server";
import { generateApplePass } from "@/lib/apple-pass";
import { getApplePassCustomerData } from "@/lib/customer-snapshot";
import { prisma, WalletPassState } from "@/lib/db";
import { isApplePassEnabled } from "@/lib/wallet-features";

export const runtime = "nodejs";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isApplePassEnabled()) {
    return NextResponse.json({ message: "Apple Wallet support is disabled" }, { status: 404 });
  }

  const { id } = await params;
  const customer = await getApplePassCustomerData(id);
  if (!customer) {
    return NextResponse.json({ message: "Customer not found" }, { status: 404 });
  }

  try {
    const passBuffer = await generateApplePass(customer);

    await prisma.customer.update({
      where: { id: customer.id },
      data: { state: WalletPassState.ACTIVE },
    });

    return new NextResponse(new Uint8Array(passBuffer), {
      headers: {
        "Cache-Control": "no-store",
        "Content-Disposition": `attachment; filename="${customer.id}.pkpass"`,
        "Content-Type": "application/vnd.apple.pkpass",
      },
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Unable to generate Apple Wallet pass" },
      { status: 500 },
    );
  }
}
