export const PAID_COFFEES_PER_FREE_COFFEE = 8;

type LoyaltyTotals = {
  totalPaidCoffees: number;
  totalFreeRedeemed: number;
};

export function deriveLoyaltyState({ totalPaidCoffees, totalFreeRedeemed }: LoyaltyTotals) {
  const totalEarned = Math.floor(totalPaidCoffees / PAID_COFFEES_PER_FREE_COFFEE);
  return {
    stampsInCycle: totalPaidCoffees % PAID_COFFEES_PER_FREE_COFFEE,
    rewardsAvailable: totalEarned - totalFreeRedeemed,
    totalPaidCoffees,
    totalFreeRedeemed,
  };
}

export function rewardsEarnedFromPurchase(currentTotalPaid: number, addedCount: number) {
  if (!Number.isInteger(addedCount) || addedCount <= 0) {
    throw new Error("purchaseCount must be a positive integer");
  }
  const before = Math.floor(currentTotalPaid / PAID_COFFEES_PER_FREE_COFFEE);
  const after = Math.floor((currentTotalPaid + addedCount) / PAID_COFFEES_PER_FREE_COFFEE);
  return after - before;
}

export function ensureRedemptionAllowed(rewardsAvailable: number, redemptionCount: number) {
  if (!Number.isInteger(redemptionCount) || redemptionCount <= 0) {
    throw new Error("redemptionCount must be a positive integer");
  }
  if (rewardsAvailable < redemptionCount) {
    throw new Error("Not enough free coffees available");
  }
}
