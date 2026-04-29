import { join, resolve } from "node:path";

import "server-only";
import { Template } from "@walletpass/pass-js";
import type { ApplePass, BarcodeDescriptor } from "@walletpass/pass-js/dist/interfaces";

import { env } from "@/env";
import { getApplePassCredentials } from "./apple-pass-credentials";
import { PAID_COFFEES_PER_FREE_COFFEE } from "./loyalty";
import { isApplePassEnabled } from "./wallet-features";

const PASS_ASSET_DIR = resolve(process.cwd(), "assets/apple-pass");
const supportsPassUpdates = env.PUBLIC_BASE_URL?.startsWith("https://") ?? false;
const PASS_FOREGROUND_COLOR = "rgb(26, 10, 0)";
const PASS_BACKGROUND_COLOR = "rgb(245, 237, 228)";
const PASS_LABEL_COLOR = "rgb(26, 10, 0)";
const PASS_ASSETS = [
  { density: "1x" as const, fileName: "icon.png", imageType: "icon" as const },
  { density: "2x" as const, fileName: "icon@2x.png", imageType: "icon" as const },
  { density: "3x" as const, fileName: "icon@3x.png", imageType: "icon" as const },
  { density: "1x" as const, fileName: "logo.png", imageType: "logo" as const },
  { density: "2x" as const, fileName: "logo@2x.png", imageType: "logo" as const },
  { density: "3x" as const, fileName: "logo@3x.png", imageType: "logo" as const },
] as const;

let templatePromise: Promise<Template> | null = null;

export type ApplePassCustomer = {
  id: string;
  appleAuthToken: string;
  stampsInCycle: number;
  rewardsAvailable: number;
  totalPaidCoffees: number;
  totalFreeRedeemed: number;
};

function buildBarcode(customerId: string): BarcodeDescriptor {
  return {
    altText: customerId,
    format: "PKBarcodeFormatQR",
    message: customerId,
    messageEncoding: "iso-8859-1",
  };
}

function buildPassFields(customer: ApplePassCustomer): Partial<ApplePass> {
  const barcode = buildBarcode(customer.id);
  const progressLabel = `${customer.stampsInCycle}/${PAID_COFFEES_PER_FREE_COFFEE}`;
  return {
    ...(supportsPassUpdates
      ? {
          authenticationToken: customer.appleAuthToken,
          webServiceURL: `${env.PUBLIC_BASE_URL?.replace(/\/+$/, "")}/api`,
        }
      : {}),
    barcode,
    barcodes: [barcode],
    description: env.APPLE_PASS_DESCRIPTION,
    organizationName: env.APPLE_PASS_ORGANIZATION_NAME,
    serialNumber: customer.id,
    storeCard: {
      headerFields: [
        {
          key: "progress",
          label: "STAMPS",
          value: progressLabel,
        },
      ],
      primaryFields: [],
      secondaryFields: [
        {
          key: "rewards",
          label: "FREE COFFEES",
          value: `${customer.rewardsAvailable}`,
        },
        {
          key: "paid",
          label: "PAID SO FAR",
          value: `${customer.totalPaidCoffees}`,
        },
      ],
      backFields: [
        {
          key: "program",
          label: "PROGRAM",
          value: `Collect ${PAID_COFFEES_PER_FREE_COFFEE} coffee stamps and your next cup is on us.`,
        },
        {
          key: "redeemed",
          label: "FREE CUPS ENJOYED",
          value: `${customer.totalFreeRedeemed}`,
        },
      ],
    },
  };
}

async function buildTemplate() {
  if (!isApplePassEnabled()) {
    throw new Error("Apple Wallet support is disabled");
  }

  if (!env.APPLE_TEAM_IDENTIFIER || !env.APPLE_PASS_TYPE_IDENTIFIER) {
    throw new Error("Apple Wallet pass configuration is incomplete");
  }

  const template = new Template(
    "storeCard",
    {
      backgroundColor: PASS_BACKGROUND_COLOR,
      description: env.APPLE_PASS_DESCRIPTION,
      foregroundColor: PASS_FOREGROUND_COLOR,
      formatVersion: 1,
      labelColor: PASS_LABEL_COLOR,
      logoText: env.APPLE_PASS_LOGO_TEXT,
      organizationName: env.APPLE_PASS_ORGANIZATION_NAME,
      passTypeIdentifier: env.APPLE_PASS_TYPE_IDENTIFIER,
      teamIdentifier: env.APPLE_TEAM_IDENTIFIER,
    },
    undefined,
    undefined,
    {
      allowHttp: process.env.NODE_ENV !== "production",
    },
  );

  await Promise.all(
    PASS_ASSETS.map(async ({ density, fileName, imageType }) => {
      await template.images.add(imageType, join(PASS_ASSET_DIR, fileName), density);
    }),
  );

  const credentials = await getApplePassCredentials();
  template.setCertificate(credentials.certificatePem);
  template.setPrivateKey(credentials.privateKeyPem, credentials.privateKeyPassphrase);

  return template;
}

async function getTemplate() {
  if (!templatePromise) {
    templatePromise = buildTemplate().catch((error) => {
      templatePromise = null;
      throw error;
    });
  }

  return templatePromise;
}

export async function generateApplePass(customer: ApplePassCustomer) {
  if (!isApplePassEnabled()) {
    throw new Error("Apple Wallet support is disabled");
  }

  const template = await getTemplate();
  const pass = template.createPass(buildPassFields(customer));
  const stamps = Math.max(0, Math.min(PAID_COFFEES_PER_FREE_COFFEE, customer.stampsInCycle));
  await pass.images.add("strip", join(PASS_ASSET_DIR, `strip-${stamps}@2x.png`), "2x");
  return pass.asBuffer();
}
