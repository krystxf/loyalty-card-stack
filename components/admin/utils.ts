import type { CoffeeEvent } from "./types";

export function extractCustomerId(rawValue: string) {
  const trimmed = rawValue.trim();
  if (!trimmed) {
    return null;
  }

  const normalizeId = (value: string) =>
    value
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9_-]/g, "")
      .toUpperCase();

  if (!trimmed.includes("://")) {
    return normalizeId(trimmed);
  }

  try {
    const url = new URL(trimmed);

    for (const key of ["customerId", "id", "memberId"]) {
      const value = url.searchParams.get(key)?.trim();
      if (value) {
        return normalizeId(value);
      }
    }

    const segments = url.pathname.split("/").filter(Boolean);
    const customersSegmentIndex = segments.findIndex((segment) => segment === "customers");
    if (customersSegmentIndex >= 0 && segments[customersSegmentIndex + 1]) {
      return normalizeId(segments[customersSegmentIndex + 1]);
    }

    return segments.at(-1) ? normalizeId(segments.at(-1) ?? "") : null;
  } catch {
    return normalizeId(trimmed);
  }
}

export function formatEventType(type: CoffeeEvent["type"]) {
  switch (type) {
    case "PAID":
      return "Paid coffees";
    case "REWARD_EARNED":
      return "Rewards earned";
    case "REWARD_REDEEMED":
      return "Rewards redeemed";
    case "MANUAL_ADJUSTMENT":
      return "Manual adjustment";
    default:
      return type;
  }
}

export function formatTimestamp(value: string) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
