import "server-only";

import { env } from "@/env";

export function isApplePassEnabled() {
  return env.IS_APPLE_PASS_ENABLED;
}

export function isGoogleWalletEnabled() {
  return env.IS_GOOGLE_WALLET_ENABLED;
}
