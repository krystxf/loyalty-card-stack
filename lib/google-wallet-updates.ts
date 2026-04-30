import "server-only";

import { getLoyaltyTotals } from "@/lib/customer-snapshot";
import { prisma } from "@/lib/db";

import { patchGoogleWalletLoyaltyObject } from "./google-wallet";
import { deriveLoyaltyState } from "./loyalty";
import { isGoogleWalletEnabled } from "./wallet-features";

export async function touchGoogleWalletAndSendUpdate(customerId: string) {
  if (!isGoogleWalletEnabled()) {
    return;
  }

  const customerRow = await prisma.customer.findUnique({
    where: { id: customerId },
    select: { hasGoogleWalletObject: true },
  });

  if (!customerRow?.hasGoogleWalletObject) {
    return;
  }

  const totals = await getLoyaltyTotals(customerId);
  const loyalty = deriveLoyaltyState(totals);

  try {
    const result = await patchGoogleWalletLoyaltyObject({
      id: customerId,
      stampsInCycle: loyalty.stampsInCycle,
      rewardsAvailable: loyalty.rewardsAvailable,
      totalPaidCoffees: loyalty.totalPaidCoffees,
      totalFreeRedeemed: loyalty.totalFreeRedeemed,
    });

    if (result.status === "missing") {
      await prisma.customer.update({
        where: { id: customerId },
        data: { hasGoogleWalletObject: false },
      });
    }
  } catch (error) {
    // Ignore Google Wallet transport failures so loyalty writes stay durable.
    console.error("[google-wallet] failed to push update", error);
  }
}

export async function markGoogleWalletObjectCreated(customerId: string) {
  await prisma.customer.update({
    where: { id: customerId },
    data: { hasGoogleWalletObject: true },
  });
}
