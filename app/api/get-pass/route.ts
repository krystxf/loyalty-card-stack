import { NextResponse } from "next/server";
import { generateApplePass } from "@/lib/apple-pass";
import { createCustomerWithWallet } from "@/lib/customer-snapshot";
import { prisma } from "@/lib/db";
import { isApplePassEnabled } from "@/lib/wallet-features";

export const runtime = "nodejs";

export async function GET() {
  if (!isApplePassEnabled()) {
    return NextResponse.json({ message: "Apple Wallet support is disabled" }, { status: 404 });
  }

  try {
    const created = await createCustomerWithWallet();
    if (!created) {
      throw new Error("Unable to create pass customer");
    }

    const { snapshot, appleAuthToken } = created;
    const passBuffer = await generateApplePass({
      id: snapshot.id,
      appleAuthToken,
      stampsInCycle: snapshot.stampsInCycle,
      rewardsAvailable: snapshot.rewardsAvailable,
      totalPaidCoffees: snapshot.totalPaidCoffees,
      totalFreeRedeemed: snapshot.totalFreeRedeemed,
    });

    await prisma.customer.update({
      where: { id: snapshot.id },
      data: { state: "ACTIVE" },
    });

    return new NextResponse(new Uint8Array(passBuffer), {
      headers: {
        "Cache-Control": "no-store",
        "Content-Disposition": 'attachment; filename="cafe-loyalty-card.pkpass"',
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
