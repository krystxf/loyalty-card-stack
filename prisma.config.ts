import { existsSync } from "node:fs";

import { config as loadEnv } from "dotenv";
import { defineConfig, env } from "prisma/config";

if (existsSync(".env.local")) {
  loadEnv({ path: ".env.local" });
}

// `prisma generate` doesn't connect, but config loading validates env() eagerly.
// Placeholder lets generate run in envs without DATABASE_URL (CI install step);
// real commands still fail at connect time if the URL isn't valid.
if (!process.env.DATABASE_URL) {
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
