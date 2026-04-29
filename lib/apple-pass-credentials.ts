import "server-only";

import { access, readFile, stat } from "node:fs/promises";
import { resolve } from "node:path";

import { env } from "@/env";

let credentialsPromise: Promise<{
  certificatePem: string;
  privateKeyPassphrase: string | undefined;
  privateKeyPem: string;
}> | null = null;

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

function normalizePem(value: string) {
  return value.replace(/\\n/g, "\n");
}

async function readPem(inlineValue: string | undefined, filePath: string) {
  if (inlineValue) {
    return normalizePem(inlineValue);
  }

  const resolvedPath = resolveProjectPath(filePath);
  await assertFileExists(resolvedPath);
  return normalizePem(await readFile(resolvedPath, "utf8"));
}

export async function getApplePassCredentials() {
  if (!credentialsPromise) {
    credentialsPromise = Promise.all([
      readPem(env.APPLE_PASS_CERT_PEM, env.APPLE_PASS_CERT_PATH),
      readPem(env.APPLE_PASS_PRIVATE_KEY_PEM, env.APPLE_PASS_KEY_PATH),
    ])
      .then(([certificatePem, privateKeyPem]) => ({
        certificatePem,
        privateKeyPassphrase: env.APPLE_PASS_KEY_PASSPHRASE,
        privateKeyPem,
      }))
      .catch((error) => {
        credentialsPromise = null;
        throw error;
      });
  }

  return credentialsPromise;
}
