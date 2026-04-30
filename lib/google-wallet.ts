import "server-only";

import { createSign } from "node:crypto";

import { env } from "@/env";
import { type GoogleWalletCredentials, getGoogleWalletCredentials } from "./google-wallet-credentials";
import { PAID_COFFEES_PER_FREE_COFFEE } from "./loyalty";
import { isGoogleWalletEnabled } from "./wallet-features";

const WALLET_OBJECTS_API = "https://walletobjects.googleapis.com/walletobjects/v1";
const OAUTH_TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
const SAVE_LINK_BASE = "https://pay.google.com/gp/v/save";
const SAVE_TO_WALLET_SCOPE = "https://www.googleapis.com/auth/wallet_object.issuer";
const PROGRAM_NAME = "Cafe Loyalty Card";
const ISSUER_NAME = "Cafe";
const HEX_BACKGROUND_COLOR = "#f5ede4";

export type GoogleWalletCustomer = {
  id: string;
  stampsInCycle: number;
  rewardsAvailable: number;
  totalPaidCoffees: number;
  totalFreeRedeemed: number;
};

function ensureEnabled() {
  if (!isGoogleWalletEnabled()) {
    throw new Error("Google Wallet support is disabled");
  }

  if (!env.GOOGLE_WALLET_ISSUER_ID) {
    throw new Error("GOOGLE_WALLET_ISSUER_ID is not configured");
  }
}

function getRequiredBaseUrl() {
  if (!env.PUBLIC_BASE_URL) {
    throw new Error("PUBLIC_BASE_URL is required for Google Wallet");
  }
  return env.PUBLIC_BASE_URL.replace(/\/+$/, "");
}

export function getLoyaltyClassId() {
  return `${env.GOOGLE_WALLET_ISSUER_ID}.${env.GOOGLE_WALLET_CLASS_SUFFIX}`;
}

export function getLoyaltyObjectId(customerId: string) {
  return `${env.GOOGLE_WALLET_ISSUER_ID}.${customerId}`;
}

function getProgramLogoUri() {
  return `${getRequiredBaseUrl()}/google-wallet/logo.png`;
}

function getOriginUrl() {
  return getRequiredBaseUrl();
}

function base64UrlEncode(input: Buffer | string) {
  const buf = typeof input === "string" ? Buffer.from(input, "utf8") : input;
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function signRs256(message: string, privateKey: string) {
  const signer = createSign("RSA-SHA256");
  signer.update(message);
  signer.end();
  return signer.sign(privateKey);
}

function signJwt(claims: Record<string, unknown>, credentials: GoogleWalletCredentials) {
  const header = { alg: "RS256", typ: "JWT" };
  const headerEncoded = base64UrlEncode(JSON.stringify(header));
  const payloadEncoded = base64UrlEncode(JSON.stringify(claims));
  const signingInput = `${headerEncoded}.${payloadEncoded}`;
  const signature = signRs256(signingInput, credentials.privateKey);
  return `${signingInput}.${base64UrlEncode(signature)}`;
}

let accessTokenCache: { token: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
  if (accessTokenCache && accessTokenCache.expiresAt - 60_000 > Date.now()) {
    return accessTokenCache.token;
  }

  const credentials = await getGoogleWalletCredentials();
  const issuedAt = Math.floor(Date.now() / 1000);

  const assertion = signJwt(
    {
      iss: credentials.clientEmail,
      scope: SAVE_TO_WALLET_SCOPE,
      aud: OAUTH_TOKEN_ENDPOINT,
      iat: issuedAt,
      exp: issuedAt + 3600,
    },
    credentials,
  );

  const response = await fetch(OAUTH_TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to obtain Google OAuth token (${response.status}): ${text}`);
  }

  const json = (await response.json()) as { access_token: string; expires_in: number };
  accessTokenCache = {
    token: json.access_token,
    expiresAt: Date.now() + json.expires_in * 1000,
  };

  return json.access_token;
}

type WalletApiOptions = {
  body?: unknown;
  method?: "GET" | "POST" | "PATCH" | "PUT";
};

async function walletApiRequest(path: string, { body, method = "GET" }: WalletApiOptions = {}) {
  const accessToken = await getAccessToken();

  const response = await fetch(`${WALLET_OBJECTS_API}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  return response;
}

function buildLoyaltyClass() {
  return {
    id: getLoyaltyClassId(),
    issuerName: ISSUER_NAME,
    programName: PROGRAM_NAME,
    reviewStatus: "UNDER_REVIEW",
    hexBackgroundColor: HEX_BACKGROUND_COLOR,
    programLogo: {
      sourceUri: {
        uri: getProgramLogoUri(),
      },
      contentDescription: {
        defaultValue: {
          language: "en-US",
          value: `${PROGRAM_NAME} logo`,
        },
      },
    },
    countryCode: "US",
    multipleDevicesAndHoldersAllowedStatus: "ONE_USER_ALL_DEVICES",
  };
}

function buildLoyaltyObject(customer: GoogleWalletCustomer) {
  return {
    id: getLoyaltyObjectId(customer.id),
    classId: getLoyaltyClassId(),
    state: "ACTIVE",
    accountId: customer.id,
    accountName: `Customer ${customer.id}`,
    barcode: {
      type: "QR_CODE",
      value: customer.id,
      alternateText: customer.id,
    },
    loyaltyPoints: {
      label: "Stamps",
      balance: {
        string: `${customer.stampsInCycle}/${PAID_COFFEES_PER_FREE_COFFEE}`,
      },
    },
    secondaryLoyaltyPoints: {
      label: "Free coffees",
      balance: {
        int: customer.rewardsAvailable,
      },
    },
    textModulesData: [
      {
        id: "program",
        header: "Program",
        body: `Collect ${PAID_COFFEES_PER_FREE_COFFEE} coffee stamps and your next cup is on us.`,
      },
      {
        id: "totals",
        header: "Lifetime totals",
        body: `Paid: ${customer.totalPaidCoffees} • Free redeemed: ${customer.totalFreeRedeemed}`,
      },
    ],
  };
}

async function ensureLoyaltyClass() {
  const classId = getLoyaltyClassId();
  const getResponse = await walletApiRequest(`/loyaltyClass/${encodeURIComponent(classId)}`);

  if (getResponse.ok) {
    return;
  }

  if (getResponse.status !== 404) {
    const text = await getResponse.text();
    throw new Error(`Failed to fetch Google Wallet loyalty class (${getResponse.status}): ${text}`);
  }

  const insertResponse = await walletApiRequest("/loyaltyClass", {
    method: "POST",
    body: buildLoyaltyClass(),
  });

  if (!insertResponse.ok) {
    const text = await insertResponse.text();
    throw new Error(`Failed to create Google Wallet loyalty class (${insertResponse.status}): ${text}`);
  }
}

export async function upsertGoogleWalletLoyaltyObject(customer: GoogleWalletCustomer) {
  ensureEnabled();
  await ensureLoyaltyClass();

  const objectPayload = buildLoyaltyObject(customer);
  const getResponse = await walletApiRequest(`/loyaltyObject/${encodeURIComponent(objectPayload.id)}`);

  if (getResponse.ok) {
    const patchResponse = await walletApiRequest(`/loyaltyObject/${encodeURIComponent(objectPayload.id)}`, {
      method: "PATCH",
      body: objectPayload,
    });

    if (!patchResponse.ok) {
      const text = await patchResponse.text();
      throw new Error(`Failed to update Google Wallet loyalty object (${patchResponse.status}): ${text}`);
    }

    return objectPayload.id;
  }

  if (getResponse.status !== 404) {
    const text = await getResponse.text();
    throw new Error(`Failed to fetch Google Wallet loyalty object (${getResponse.status}): ${text}`);
  }

  const insertResponse = await walletApiRequest("/loyaltyObject", {
    method: "POST",
    body: objectPayload,
  });

  if (!insertResponse.ok) {
    const text = await insertResponse.text();
    throw new Error(`Failed to create Google Wallet loyalty object (${insertResponse.status}): ${text}`);
  }

  return objectPayload.id;
}

export async function patchGoogleWalletLoyaltyObject(customer: GoogleWalletCustomer) {
  ensureEnabled();

  const objectPayload = buildLoyaltyObject(customer);
  const response = await walletApiRequest(`/loyaltyObject/${encodeURIComponent(objectPayload.id)}`, {
    method: "PATCH",
    body: {
      state: objectPayload.state,
      loyaltyPoints: objectPayload.loyaltyPoints,
      secondaryLoyaltyPoints: objectPayload.secondaryLoyaltyPoints,
      textModulesData: objectPayload.textModulesData,
    },
  });

  if (response.status === 404) {
    return { status: "missing" as const };
  }

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to patch Google Wallet loyalty object (${response.status}): ${text}`);
  }

  return { status: "ok" as const };
}

export async function generateGoogleWalletSaveUrl(customer: GoogleWalletCustomer) {
  ensureEnabled();

  await upsertGoogleWalletLoyaltyObject(customer);

  const credentials = await getGoogleWalletCredentials();
  const objectId = getLoyaltyObjectId(customer.id);

  const issuedAt = Math.floor(Date.now() / 1000);
  const claims = {
    iss: credentials.clientEmail,
    aud: "google",
    typ: "savetowallet",
    iat: issuedAt,
    origins: [getOriginUrl()],
    payload: {
      loyaltyObjects: [{ id: objectId }],
    },
  } satisfies Record<string, unknown>;

  const jwt = signJwt(claims, credentials);
  return `${SAVE_LINK_BASE}/${jwt}`;
}

export const __internals = {
  buildLoyaltyClass,
  buildLoyaltyObject,
  signJwt,
};
