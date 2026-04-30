import { readFile } from "node:fs/promises";
import { join, resolve } from "node:path";

import "server-only";
import { PKPass } from "passkit-generator";

import { env } from "@/env";
import { getApplePassCredentials } from "./apple-pass-credentials";
import { PAID_COFFEES_PER_FREE_COFFEE } from "./loyalty";
import { isApplePassEnabled } from "./wallet-features";

const PASS_ASSET_DIR = resolve(process.cwd(), "assets/apple-pass");
const WWDR_CERT_PATH = resolve(process.cwd(), "cert/AppleWWDRCAG4.pem");
const supportsPassUpdates = env.PUBLIC_BASE_URL?.startsWith("https://") ?? false;

const PASS_FOREGROUND_COLOR = "rgb(26, 10, 0)";
const PASS_BACKGROUND_COLOR = "rgb(245, 237, 228)";
const PASS_LABEL_COLOR = "rgb(26, 10, 0)";
const PASS_ORGANIZATION_NAME = "Cafe";
const PASS_DESCRIPTION = "Cafe Loyalty Card";
const PASS_LOGO_TEXT = "Cafe";

const STATIC_PASS_ASSETS = [
  "icon.png",
  "icon@2x.png",
  "icon@3x.png",
  "logo.png",
  "logo@2x.png",
  "logo@3x.png",
] as const;
const STRIP_VARIANT_COUNT = PAID_COFFEES_PER_FREE_COFFEE + 1;

let assetsPromise: Promise<{ static: Record<string, Buffer>; strips: Buffer[] }> | null = null;
let certificatesPromise: Promise<{
  wwdr: string;
  signerCert: string;
  signerKey: string;
  signerKeyPassphrase: string | undefined;
}> | null = null;

export type ApplePassCustomer = {
  id: string;
  appleAuthToken: string;
  stampsInCycle: number;
  rewardsAvailable: number;
  totalPaidCoffees: number;
  totalFreeRedeemed: number;
};

async function loadAssets() {
  if (!assetsPromise) {
    assetsPromise = (async () => {
      const [staticEntries, strips] = await Promise.all([
        Promise.all(
          STATIC_PASS_ASSETS.map(async (name) => [name, await readFile(join(PASS_ASSET_DIR, name))] as const),
        ),
        Promise.all(
          Array.from({ length: STRIP_VARIANT_COUNT }, (_, index) =>
            readFile(join(PASS_ASSET_DIR, `strip-${index}@2x.png`)),
          ),
        ),
      ]);

      return {
        static: Object.fromEntries(staticEntries),
        strips,
      };
    })().catch((error) => {
      assetsPromise = null;
      throw error;
    });
  }

  return assetsPromise;
}

async function loadCertificates() {
  if (!certificatesPromise) {
    certificatesPromise = (async () => {
      const [credentials, wwdr] = await Promise.all([getApplePassCredentials(), readFile(WWDR_CERT_PATH, "utf8")]);

      return {
        wwdr,
        signerCert: credentials.certificatePem,
        signerKey: credentials.privateKeyPem,
        signerKeyPassphrase: credentials.privateKeyPassphrase,
      };
    })().catch((error) => {
      certificatesPromise = null;
      throw error;
    });
  }

  return certificatesPromise;
}

export async function generateApplePass(customer: ApplePassCustomer) {
  if (!isApplePassEnabled()) {
    throw new Error("Apple Wallet support is disabled");
  }

  if (!env.APPLE_TEAM_IDENTIFIER || !env.APPLE_PASS_TYPE_IDENTIFIER) {
    throw new Error("Apple Wallet pass configuration is incomplete");
  }

  const [assets, certificates] = await Promise.all([loadAssets(), loadCertificates()]);

  const stamps = Math.max(0, Math.min(PAID_COFFEES_PER_FREE_COFFEE, customer.stampsInCycle));

  const buffers: Record<string, Buffer> = {
    ...assets.static,
    "strip@2x.png": assets.strips[stamps],
  };

  const pass = new PKPass(buffers, certificates, {
    formatVersion: 1,
    serialNumber: customer.id,
    description: PASS_DESCRIPTION,
    organizationName: PASS_ORGANIZATION_NAME,
    passTypeIdentifier: env.APPLE_PASS_TYPE_IDENTIFIER,
    teamIdentifier: env.APPLE_TEAM_IDENTIFIER,
    logoText: PASS_LOGO_TEXT,
    foregroundColor: PASS_FOREGROUND_COLOR,
    backgroundColor: PASS_BACKGROUND_COLOR,
    labelColor: PASS_LABEL_COLOR,
    ...(supportsPassUpdates
      ? {
          authenticationToken: customer.appleAuthToken,
          webServiceURL: `${env.PUBLIC_BASE_URL?.replace(/\/+$/, "")}/api`,
        }
      : {}),
  });

  pass.type = "storeCard";

  pass.headerFields.push({
    key: "progress",
    label: "STAMPS",
    value: `${stamps}/${PAID_COFFEES_PER_FREE_COFFEE}`,
  });
  pass.secondaryFields.push(
    { key: "rewards", label: "FREE COFFEES", value: `${customer.rewardsAvailable}` },
    { key: "paid", label: "PAID SO FAR", value: `${customer.totalPaidCoffees}` },
  );
  pass.backFields.push(
    {
      key: "program",
      label: "PROGRAM",
      value: `Collect ${PAID_COFFEES_PER_FREE_COFFEE} coffee stamps and your next cup is on us.`,
    },
    { key: "redeemed", label: "FREE CUPS ENJOYED", value: `${customer.totalFreeRedeemed}` },
  );

  pass.setBarcodes({
    altText: customer.id,
    format: "PKBarcodeFormatQR",
    message: customer.id,
    messageEncoding: "iso-8859-1",
  });

  return pass.getAsBuffer();
}
