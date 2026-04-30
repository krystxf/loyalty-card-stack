export type { CoffeeEvent, CustomerResponse, CustomerSnapshot as Customer } from "@/lib/types";

export const maxQuantity = 12;
export const repeatedScanCooldownMs = 3000;

export type ActionKind = "purchase" | "redeem";
export type LookupSource = "manual" | "scanner";
