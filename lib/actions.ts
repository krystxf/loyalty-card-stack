"use server";

import { z } from "zod";

import { buildCustomerResponse, recordPurchase, recordRewardRedemption } from "./customer-snapshot";
import type { CustomerResponse } from "./types";

const mutationInputSchema = z.object({
  customerId: z.string().min(1),
  count: z.number().int().positive().max(100).default(1),
});

export async function recordPurchaseAction(input: z.input<typeof mutationInputSchema>): Promise<CustomerResponse> {
  const { customerId, count } = mutationInputSchema.parse(input);
  const customer = await recordPurchase(customerId, count);
  if (!customer) {
    throw new Error("Customer not found");
  }
  return buildCustomerResponse(customer);
}

export async function redeemRewardAction(input: z.input<typeof mutationInputSchema>): Promise<CustomerResponse> {
  const { customerId, count } = mutationInputSchema.parse(input);
  const customer = await recordRewardRedemption(customerId, count);
  if (!customer) {
    throw new Error("Customer not found");
  }
  return buildCustomerResponse(customer);
}
