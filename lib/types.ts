export type CoffeeEvent = {
  id: number;
  type: "PAID" | "REWARD_EARNED" | "REWARD_REDEEMED" | "MANUAL_ADJUSTMENT";
  count: number;
  createdAt: string;
};

export type CustomerSnapshot = {
  id: string;
  state: "PENDING" | "ACTIVE";
  revision: number;
  createdAt: string;
  updatedAt: string;
  stampsInCycle: number;
  rewardsAvailable: number;
  totalPaidCoffees: number;
  totalFreeRedeemed: number;
  coffeeEvents: CoffeeEvent[];
};

export type CustomerResponse = {
  customer: CustomerSnapshot;
  loyaltyRule: {
    paidCoffeesPerFreeCoffee: number;
  };
};
