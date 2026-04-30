import { existsSync } from "node:fs";

import { config as loadEnv } from "dotenv";
import { defineConfig, env } from "prisma/config";

if (existsSync(".env.local")) {
  loadEnv({ path: ".env.local" });
}

// `prisma generate` doesn't connect, but config loading validates env() eagerly.
// Placeholder lets generate run in non-prod envs without DATABASE_URL (CI install step).
// Guarded against production so a missing URL there still surfaces as a real error.
if (!process.env.DATABASE_URL && process.env.NODE_ENV !== "production") {
  process.env.DATABASE_URL = "postgresql://placeholder:placeholder@localhost:5432/placeholder";
}

export default defineConfig({
  schema: "./prisma/schema.prisma",
  migrations: {
    path: "./prisma/migrations",
  },
  datasource: {
    url: env("DATABASE_URL"),
  },
});
