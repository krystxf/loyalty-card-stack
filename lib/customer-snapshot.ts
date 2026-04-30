import { randomBytes } from "node:crypto";

import { Prisma } from "@prisma/client";

import { type CoffeeEventType, prisma } from "@/lib/db";

import type { ApplePassCustomer } from "./apple-pass";
import { touchApplePassAndSendUpdate } from "./apple-pass-updates";
import type { GoogleWalletCustomer } from "./google-wallet";
import { touchGoogleWalletAndSendUpdate } from "./google-wallet-updates";
import {
  deriveLoyaltyState,
  ensureRedemptionAllowed,
  PAID_COFFEES_PER_FREE_COFFEE,
  rewardsEarnedFromPurchase,
} from "./loyalty";
import type { CustomerSnapshot } from "./types";

type LoyaltyTotals = {
  totalPaidCoffees: number;
  totalFreeRedeemed: number;
};

export async function getLoyaltyTotals(customerId: string): Promise<LoyaltyTotals> {
  const grouped = await prisma.coffeeEvent.groupBy({
    by: ["type"],
    where: { customerId },
    _sum: { count: true },
  });

  const sumOf = (type: CoffeeEventType) => grouped.find((row) => row.type === type)?._sum.count ?? 0;

  return {
    totalPaidCoffees: sumOf("PAID"),
    totalFreeRedeemed: sumOf("REWARD_REDEEMED"),
  };
}

type CustomerWithEvents = NonNullable<Awaited<ReturnType<typeof findCustomerWithEvents>>>;

function findCustomerWithEvents(customerId: string) {
  return prisma.customer.findUnique({
    where: { id: customerId },
    include: {
      coffeeEvents: {
        orderBy: { createdAt: "desc" },
        take: 20,
      },
    },
  });
}

function buildSnapshot(customer: CustomerWithEvents, totals: LoyaltyTotals): CustomerSnapshot {
  const loyalty = deriveLoyaltyState(totals);
  return {
    id: customer.id,
    state: customer.state,
    revision: customer.revision,
    createdAt: customer.createdAt.toISOString(),
    updatedAt: customer.updatedAt.toISOString(),
    ...loyalty,
    coffeeEvents: customer.coffeeEvents.map((event) => ({
      id: event.id,
      type: event.type,
      count: event.count,
      createdAt: event.createdAt.toISOString(),
    })),
  };
}

export async function getCustomerSnapshot(customerId: string): Promise<CustomerSnapshot | null> {
  const [customer, totals] = await Promise.all([findCustomerWithEvents(customerId), getLoyaltyTotals(customerId)]);

  if (!customer) {
    return null;
  }

  return buildSnapshot(customer, totals);
}

export async function recordPurchase(customerId: string, count: number) {
  const totals = await getLoyaltyTotals(customerId);
  const earnedRewards = rewardsEarnedFromPurchase(totals.totalPaidCoffees, count);

  await prisma.$transaction(async (tx) => {
    await tx.coffeeEvent.create({
      data: {
        customerId,
        type: "PAID",
        count,
      },
    });

    if (earnedRewards > 0) {
      await tx.coffeeEvent.create({
        data: {
          customerId,
          type: "REWARD_EARNED",
          count: earnedRewards,
        },
      });
    }
  });

  touchApplePassAndSendUpdate(customerId);
  touchGoogleWalletAndSendUpdate(customerId);

  const customer = await findCustomerWithEvents(customerId);
  if (!customer) {
    return null;
  }

  return buildSnapshot(customer, {
    totalPaidCoffees: totals.totalPaidCoffees + count,
    totalFreeRedeemed: totals.totalFreeRedeemed,
  });
}

export async function recordRewardRedemption(customerId: string, count: number) {
  const totals = await getLoyaltyTotals(customerId);
  const { rewardsAvailable } = deriveLoyaltyState(totals);
  ensureRedemptionAllowed(rewardsAvailable, count);

  await prisma.coffeeEvent.create({
    data: {
      customerId,
      type: "REWARD_REDEEMED",
      count,
    },
  });

  touchApplePassAndSendUpdate(customerId);
  touchGoogleWalletAndSendUpdate(customerId);

  const customer = await findCustomerWithEvents(customerId);
  if (!customer) {
    return null;
  }

  return buildSnapshot(customer, {
    totalPaidCoffees: totals.totalPaidCoffees,
    totalFreeRedeemed: totals.totalFreeRedeemed + count,
  });
}

const CUSTOMER_ID_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
const CUSTOMER_ID_LENGTH = 4;
const CUSTOMER_ID_MAX_ATTEMPTS = 16;

function generateCustomerId() {
  const bytes = randomBytes(CUSTOMER_ID_LENGTH);
  let result = "";
  for (let index = 0; index < CUSTOMER_ID_LENGTH; index += 1) {
    result += CUSTOMER_ID_ALPHABET[bytes[index] % CUSTOMER_ID_ALPHABET.length];
  }
  return result;
}

export async function createCustomerWithWallet() {
  for (let attempt = 0; attempt < CUSTOMER_ID_MAX_ATTEMPTS; attempt += 1) {
    const id = generateCustomerId();

    try {
      const customer = await prisma.$transaction(async (tx) => {
        const createdCustomer = await tx.customer.create({
          data: {
            id,
            appleAuthToken: randomBytes(18).toString("hex"),
          },
        });

        for (let index = 0; index < 2; index += 1) {
          await tx.coffeeEvent.create({
            data: {
              customerId: createdCustomer.id,
              type: "MANUAL_ADJUSTMENT",
              count: 1,
            },
          });
        }

        return createdCustomer;
      });

      const snapshot = await getCustomerSnapshot(customer.id);
      if (!snapshot) {
        return null;
      }
      return { snapshot, appleAuthToken: customer.appleAuthToken };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        continue;
      }
      throw error;
    }
  }

  throw new Error("Failed to allocate a unique customer id after multiple attempts");
}

export async function getApplePassCustomerData(customerId: string): Promise<ApplePassCustomer | null> {
  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
  });

  if (!customer) {
    return null;
  }

  const totals = await getLoyaltyTotals(customerId);
  const loyalty = deriveLoyaltyState(totals);

  return {
    id: customer.id,
    appleAuthToken: customer.appleAuthToken,
    stampsInCycle: loyalty.stampsInCycle,
    rewardsAvailable: loyalty.rewardsAvailable,
    totalPaidCoffees: loyalty.totalPaidCoffees,
    totalFreeRedeemed: loyalty.totalFreeRedeemed,
  };
}

export async function getGoogleWalletCustomerData(customerId: string): Promise<GoogleWalletCustomer | null> {
  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
  });

  if (!customer) {
    return null;
  }

  const totals = await getLoyaltyTotals(customerId);
  const loyalty = deriveLoyaltyState(totals);

  return {
    id: customer.id,
    stampsInCycle: loyalty.stampsInCycle,
    rewardsAvailable: loyalty.rewardsAvailable,
    totalPaidCoffees: loyalty.totalPaidCoffees,
    totalFreeRedeemed: loyalty.totalFreeRedeemed,
  };
}

export function buildCustomerResponse(customer: CustomerSnapshot) {
  return {
    customer,
    loyaltyRule: {
      paidCoffeesPerFreeCoffee: PAID_COFFEES_PER_FREE_COFFEE,
    },
  };
}
