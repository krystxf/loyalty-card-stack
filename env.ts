import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

const parsedEnv = createEnv({
  server: {
    PUBLIC_BASE_URL: z.string().url().optional(),
    DATABASE_URL: z.string().url(),
    CORS_ORIGIN: z.string().default("*"),
    IS_APPLE_PASS_ENABLED: z
      .string()
      .default("true")
      .transform((value) => value.toLowerCase() === "true"),
    APPLE_TEAM_IDENTIFIER: z.string().default(""),
    APPLE_PASS_TYPE_IDENTIFIER: z.string().default(""),
    APPLE_PASS_CERT_PATH: z.string().default(".secrets/apple-wallet/pass.pem"),
    APPLE_PASS_KEY_PATH: z.string().default(".secrets/apple-wallet/pass-signing.key"),
    APPLE_PASS_CERT_PEM: z.string().optional(),
    APPLE_PASS_PRIVATE_KEY_PEM: z.string().optional(),
    APPLE_PASS_KEY_PASSPHRASE: z.string().optional(),
    IS_GOOGLE_WALLET_ENABLED: z
      .string()
      .default("false")
      .transform((value) => value.toLowerCase() === "true"),
    GOOGLE_WALLET_ISSUER_ID: z.string().default(""),
    GOOGLE_WALLET_CLASS_SUFFIX: z.string().default("loyalty"),
    GOOGLE_WALLET_SERVICE_ACCOUNT_EMAIL: z.string().default(""),
    GOOGLE_WALLET_SERVICE_ACCOUNT_KEY_PATH: z.string().default(".secrets/google-wallet/service-account.json"),
    GOOGLE_WALLET_SERVICE_ACCOUNT_KEY_JSON: z.string().optional(),
    GOOGLE_WALLET_SERVICE_ACCOUNT_PRIVATE_KEY: z.string().optional(),
  },
  runtimeEnv: {
    PUBLIC_BASE_URL: process.env.PUBLIC_BASE_URL,
    DATABASE_URL: process.env.DATABASE_URL,
    CORS_ORIGIN: process.env.CORS_ORIGIN,
    IS_APPLE_PASS_ENABLED: process.env.IS_APPLE_PASS_ENABLED,
    APPLE_TEAM_IDENTIFIER: process.env.APPLE_TEAM_IDENTIFIER,
    APPLE_PASS_TYPE_IDENTIFIER: process.env.APPLE_PASS_TYPE_IDENTIFIER,
    APPLE_PASS_CERT_PATH: process.env.APPLE_PASS_CERT_PATH,
    APPLE_PASS_KEY_PATH: process.env.APPLE_PASS_KEY_PATH,
    APPLE_PASS_CERT_PEM: process.env.APPLE_PASS_CERT_PEM,
    APPLE_PASS_PRIVATE_KEY_PEM: process.env.APPLE_PASS_PRIVATE_KEY_PEM,
    APPLE_PASS_KEY_PASSPHRASE: process.env.APPLE_PASS_KEY_PASSPHRASE,
    IS_GOOGLE_WALLET_ENABLED: process.env.IS_GOOGLE_WALLET_ENABLED,
    GOOGLE_WALLET_ISSUER_ID: process.env.GOOGLE_WALLET_ISSUER_ID,
    GOOGLE_WALLET_CLASS_SUFFIX: process.env.GOOGLE_WALLET_CLASS_SUFFIX,
    GOOGLE_WALLET_SERVICE_ACCOUNT_EMAIL: process.env.GOOGLE_WALLET_SERVICE_ACCOUNT_EMAIL,
    GOOGLE_WALLET_SERVICE_ACCOUNT_KEY_PATH: process.env.GOOGLE_WALLET_SERVICE_ACCOUNT_KEY_PATH,
    GOOGLE_WALLET_SERVICE_ACCOUNT_KEY_JSON: process.env.GOOGLE_WALLET_SERVICE_ACCOUNT_KEY_JSON,
    GOOGLE_WALLET_SERVICE_ACCOUNT_PRIVATE_KEY: process.env.GOOGLE_WALLET_SERVICE_ACCOUNT_PRIVATE_KEY,
  },
  emptyStringAsUndefined: true,
});

function assertWalletEnvConfig() {
  const issues: string[] = [];

  if (parsedEnv.IS_APPLE_PASS_ENABLED) {
    if (!parsedEnv.APPLE_TEAM_IDENTIFIER) {
      issues.push("APPLE_TEAM_IDENTIFIER is required when IS_APPLE_PASS_ENABLED=true");
    }

    if (!parsedEnv.APPLE_PASS_TYPE_IDENTIFIER) {
      issues.push("APPLE_PASS_TYPE_IDENTIFIER is required when IS_APPLE_PASS_ENABLED=true");
    }

    if (!parsedEnv.APPLE_PASS_CERT_PEM && !parsedEnv.APPLE_PASS_CERT_PATH) {
      issues.push("APPLE_PASS_CERT_PEM or APPLE_PASS_CERT_PATH is required when IS_APPLE_PASS_ENABLED=true");
    }

    if (!parsedEnv.APPLE_PASS_PRIVATE_KEY_PEM && !parsedEnv.APPLE_PASS_KEY_PATH) {
      issues.push("APPLE_PASS_PRIVATE_KEY_PEM or APPLE_PASS_KEY_PATH is required when IS_APPLE_PASS_ENABLED=true");
    }
  }

  if (parsedEnv.IS_GOOGLE_WALLET_ENABLED) {
    if (!parsedEnv.GOOGLE_WALLET_ISSUER_ID) {
      issues.push("GOOGLE_WALLET_ISSUER_ID is required when IS_GOOGLE_WALLET_ENABLED=true");
    }

    if (!parsedEnv.GOOGLE_WALLET_SERVICE_ACCOUNT_EMAIL) {
      issues.push("GOOGLE_WALLET_SERVICE_ACCOUNT_EMAIL is required when IS_GOOGLE_WALLET_ENABLED=true");
    }

    if (
      !parsedEnv.GOOGLE_WALLET_SERVICE_ACCOUNT_PRIVATE_KEY &&
      !parsedEnv.GOOGLE_WALLET_SERVICE_ACCOUNT_KEY_JSON &&
      !parsedEnv.GOOGLE_WALLET_SERVICE_ACCOUNT_KEY_PATH
    ) {
      issues.push(
        "GOOGLE_WALLET_SERVICE_ACCOUNT_PRIVATE_KEY, GOOGLE_WALLET_SERVICE_ACCOUNT_KEY_JSON or GOOGLE_WALLET_SERVICE_ACCOUNT_KEY_PATH is required when IS_GOOGLE_WALLET_ENABLED=true",
      );
    }

    if (!parsedEnv.PUBLIC_BASE_URL) {
      issues.push("PUBLIC_BASE_URL is required when IS_GOOGLE_WALLET_ENABLED=true (used for hosted class assets)");
    }
  }

  if (issues.length > 0) {
    throw new Error(`Invalid wallet env configuration:\n- ${issues.join("\n- ")}`);
  }
}

assertWalletEnvConfig();

export const env = parsedEnv;
