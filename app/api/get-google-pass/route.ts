import { NextResponse } from "next/server";
import { createCustomerWithWallet } from "@/lib/customer-snapshot";
import { prisma } from "@/lib/db";
import { generateGoogleWalletSaveUrl } from "@/lib/google-wallet";
import { markGoogleWalletObjectCreated } from "@/lib/google-wallet-updates";
import { isGoogleWalletEnabled } from "@/lib/wallet-features";

export const runtime = "nodejs";

export async function GET() {
  if (!isGoogleWalletEnabled()) {
    return NextResponse.json({ message: "Google Wallet support is disabled" }, { status: 404 });
  }

  try {
    const created = await createCustomerWithWallet();
    if (!created) {
      throw new Error("Unable to create pass customer");
    }

    const { snapshot } = created;
    const saveUrl = await generateGoogleWalletSaveUrl({
      id: snapshot.id,
      stampsInCycle: snapshot.stampsInCycle,
      rewardsAvailable: snapshot.rewardsAvailable,
      totalPaidCoffees: snapshot.totalPaidCoffees,
      totalFreeRedeemed: snapshot.totalFreeRedeemed,
    });

    await Promise.all([
      markGoogleWalletObjectCreated(snapshot.id),
      prisma.customer.update({
        where: { id: snapshot.id },
        data: { state: "ACTIVE" },
      }),
    ]);

    return NextResponse.redirect(saveUrl);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Unable to generate Google Wallet pass" },
      { status: 500 },
    );
  }
}
