import "server-only";

import { env } from "@/env";

export function isApplePassEnabled() {
  return env.IS_APPLE_PASS_ENABLED;
}
