import "server-only";

import { access, stat } from "node:fs/promises";
import { resolve } from "node:path";

import { env } from "@/env";
import { isGoogleWalletEnabled } from "./wallet-features";

async function isFile(filePath: string) {
  try {
    await access(filePath);
    const file = await stat(filePath);
    return file.isFile();
  } catch {
    return false;
  }
}

export async function getGoogleWalletReadiness() {
  const enabled = isGoogleWalletEnabled();
  if (!enabled) {
    return {
      enabled,
      hasIssuerId: Boolean(env.GOOGLE_WALLET_ISSUER_ID),
      hasPublicBaseUrl: Boolean(env.PUBLIC_BASE_URL),
      hasServiceAccount: false,
      hasServiceAccountEmail: Boolean(env.GOOGLE_WALLET_SERVICE_ACCOUNT_EMAIL),
      ok: true,
      status: "disabled",
    } as const;
  }

  const hasInlinePrivateKey = Boolean(env.GOOGLE_WALLET_SERVICE_ACCOUNT_PRIVATE_KEY);
  const hasInlineKeyJson = Boolean(env.GOOGLE_WALLET_SERVICE_ACCOUNT_KEY_JSON);
  const hasKeyFile =
    Boolean(env.GOOGLE_WALLET_SERVICE_ACCOUNT_KEY_PATH) &&
    (await isFile(resolve(process.cwd(), env.GOOGLE_WALLET_SERVICE_ACCOUNT_KEY_PATH)));

  const hasServiceAccount = hasInlinePrivateKey || hasInlineKeyJson || hasKeyFile;
  const hasServiceAccountEmail = hasInlineKeyJson || Boolean(env.GOOGLE_WALLET_SERVICE_ACCOUNT_EMAIL);

  const ok =
    Boolean(env.GOOGLE_WALLET_ISSUER_ID) && Boolean(env.PUBLIC_BASE_URL) && hasServiceAccount && hasServiceAccountEmail;

  return {
    enabled,
    hasIssuerId: Boolean(env.GOOGLE_WALLET_ISSUER_ID),
    hasPublicBaseUrl: Boolean(env.PUBLIC_BASE_URL),
    hasServiceAccount,
    hasServiceAccountEmail,
    ok,
    status: ok ? "ok" : "degraded",
  } as const;
}
