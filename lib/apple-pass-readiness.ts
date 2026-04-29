import "server-only";

import { access, stat } from "node:fs/promises";
import { join, resolve } from "node:path";

import { env } from "@/env";
import { isApplePassEnabled } from "./wallet-features";

const PASS_ASSET_NAMES = ["icon.png", "icon@2x.png", "icon@3x.png", "logo.png", "logo@2x.png", "logo@3x.png"] as const;
const PASS_ASSET_DIR = resolve(process.cwd(), "assets/apple-pass");

async function isFile(filePath: string) {
  try {
    await access(filePath);
    const file = await stat(filePath);
    return file.isFile();
  } catch {
    return false;
  }
}

export async function getApplePassReadiness() {
  const enabled = isApplePassEnabled();
  if (!enabled) {
    return {
      enabled,
      hasAssets: false,
      hasCertificatePem: false,
      hasPassTypeIdentifier: Boolean(env.APPLE_PASS_TYPE_IDENTIFIER),
      hasPrivateKeyPem: false,
      hasTeamIdentifier: Boolean(env.APPLE_TEAM_IDENTIFIER),
      ok: true,
      status: "disabled",
    } as const;
  }

  const hasCertificatePem =
    Boolean(env.APPLE_PASS_CERT_PEM) || (await isFile(resolve(process.cwd(), env.APPLE_PASS_CERT_PATH)));
  const hasPrivateKeyPem =
    Boolean(env.APPLE_PASS_PRIVATE_KEY_PEM) || (await isFile(resolve(process.cwd(), env.APPLE_PASS_KEY_PATH)));
  const assetChecks = await Promise.all(PASS_ASSET_NAMES.map((fileName) => isFile(join(PASS_ASSET_DIR, fileName))));
  const hasAssets = assetChecks.every(Boolean);

  const ok =
    Boolean(env.APPLE_TEAM_IDENTIFIER) &&
    Boolean(env.APPLE_PASS_TYPE_IDENTIFIER) &&
    hasCertificatePem &&
    hasPrivateKeyPem &&
    hasAssets;

  return {
    enabled,
    hasAssets,
    hasCertificatePem,
    hasPassTypeIdentifier: Boolean(env.APPLE_PASS_TYPE_IDENTIFIER),
    hasPrivateKeyPem,
    hasTeamIdentifier: Boolean(env.APPLE_TEAM_IDENTIFIER),
    ok,
    status: ok ? "ok" : "degraded",
  } as const;
}
