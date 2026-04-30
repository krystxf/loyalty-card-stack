import "server-only";

import { access, readFile, stat } from "node:fs/promises";
import { resolve } from "node:path";

import { env } from "@/env";

export type GoogleWalletCredentials = {
  clientEmail: string;
  privateKey: string;
};

let credentialsPromise: Promise<GoogleWalletCredentials> | null = null;

function resolveProjectPath(filePath: string) {
  return resolve(process.cwd(), filePath);
}

async function assertFileExists(filePath: string) {
  await access(filePath);

  const file = await stat(filePath);
  if (!file.isFile()) {
    throw new Error(`Expected file at ${filePath}`);
  }
}

function normalizeKey(value: string) {
  return value.replace(/\\n/g, "\n");
}

async function loadFromKeyFile(filePath: string): Promise<GoogleWalletCredentials> {
  const resolvedPath = resolveProjectPath(filePath);
  await assertFileExists(resolvedPath);
  const raw = await readFile(resolvedPath, "utf8");
  const parsed = JSON.parse(raw) as { client_email?: string; private_key?: string };

  if (!parsed.client_email || !parsed.private_key) {
    throw new Error(`Google Wallet service account JSON at ${filePath} is missing client_email or private_key`);
  }

  return {
    clientEmail: parsed.client_email,
    privateKey: normalizeKey(parsed.private_key),
  };
}

function loadFromInlineJson(rawJson: string): GoogleWalletCredentials {
  const parsed = JSON.parse(rawJson) as { client_email?: string; private_key?: string };
  if (!parsed.client_email || !parsed.private_key) {
    throw new Error("GOOGLE_WALLET_SERVICE_ACCOUNT_KEY_JSON is missing client_email or private_key");
  }

  return {
    clientEmail: parsed.client_email,
    privateKey: normalizeKey(parsed.private_key),
  };
}

function loadFromInlineKey(): GoogleWalletCredentials {
  if (!env.GOOGLE_WALLET_SERVICE_ACCOUNT_EMAIL) {
    throw new Error(
      "GOOGLE_WALLET_SERVICE_ACCOUNT_EMAIL is required when using GOOGLE_WALLET_SERVICE_ACCOUNT_PRIVATE_KEY",
    );
  }

  if (!env.GOOGLE_WALLET_SERVICE_ACCOUNT_PRIVATE_KEY) {
    throw new Error("GOOGLE_WALLET_SERVICE_ACCOUNT_PRIVATE_KEY is empty");
  }

  return {
    clientEmail: env.GOOGLE_WALLET_SERVICE_ACCOUNT_EMAIL,
    privateKey: normalizeKey(env.GOOGLE_WALLET_SERVICE_ACCOUNT_PRIVATE_KEY),
  };
}

async function loadCredentials(): Promise<GoogleWalletCredentials> {
  if (env.GOOGLE_WALLET_SERVICE_ACCOUNT_PRIVATE_KEY) {
    return loadFromInlineKey();
  }

  if (env.GOOGLE_WALLET_SERVICE_ACCOUNT_KEY_JSON) {
    return loadFromInlineJson(env.GOOGLE_WALLET_SERVICE_ACCOUNT_KEY_JSON);
  }

  if (env.GOOGLE_WALLET_SERVICE_ACCOUNT_KEY_PATH) {
    return loadFromKeyFile(env.GOOGLE_WALLET_SERVICE_ACCOUNT_KEY_PATH);
  }

  throw new Error("No Google Wallet service account credentials configured");
}

export async function getGoogleWalletCredentials() {
  if (!credentialsPromise) {
    credentialsPromise = loadCredentials().catch((error) => {
      credentialsPromise = null;
      throw error;
    });
  }

  return credentialsPromise;
}
