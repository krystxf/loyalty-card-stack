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

  if (issues.length > 0) {
    throw new Error(`Invalid wallet env configuration:\n- ${issues.join("\n- ")}`);
  }
}

assertWalletEnvConfig();

export const env = parsedEnv;
