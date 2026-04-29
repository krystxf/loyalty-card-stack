import { connect } from "node:http2";

import "server-only";

import { env } from "@/env";
import { prisma } from "@/lib/db";
import { getApplePassCredentials } from "./apple-pass-credentials";
import { isApplePassEnabled } from "./wallet-features";

const APPLE_PASS_AUTH_SCHEME = "ApplePass";
const APNS_HOST = "api.push.apple.com";

function parseAuthorizationToken(headerValue?: string | null) {
  if (!headerValue) {
    return null;
  }

  const [scheme, token] = headerValue.split(" ");
  if (scheme !== APPLE_PASS_AUTH_SCHEME || !token) {
    return null;
  }

  return token;
}

function normalizePassTypeIdentifier(passTypeIdentifier: string) {
  return passTypeIdentifier === env.APPLE_PASS_TYPE_IDENTIFIER;
}

function toUpdateTag(date: Date) {
  return date.toISOString();
}

function parseUpdateTag(tag?: string) {
  if (!tag) {
    return null;
  }

  const parsedDate = new Date(tag);
  if (Number.isNaN(parsedDate.getTime())) {
    return null;
  }

  return parsedDate;
}

function hasInvalidTokenReason(statusCode: number, responseBody: string) {
  if (statusCode !== 400 && statusCode !== 410) {
    return false;
  }

  try {
    const payload = JSON.parse(responseBody) as { reason?: string };
    return (
      payload.reason === "BadDeviceToken" ||
      payload.reason === "Unregistered" ||
      payload.reason === "DeviceTokenNotForTopic"
    );
  } catch {
    return false;
  }
}

async function sendPushNotification(pushToken: string) {
  const credentials = await getApplePassCredentials();

  return new Promise<{ body: string; statusCode: number }>((resolvePromise, rejectPromise) => {
    const client = connect(`https://${APNS_HOST}`, {
      cert: credentials.certificatePem,
      key: credentials.privateKeyPem,
      passphrase: credentials.privateKeyPassphrase,
    });

    let settled = false;
    let statusCode = 0;
    let responseBody = "";

    const finalize = (handler: () => void) => {
      if (settled) {
        return;
      }

      settled = true;
      handler();
      client.close();
      client.destroy();
    };

    client.setTimeout(5000, () => {
      finalize(() => rejectPromise(new Error(`Timed out connecting to ${APNS_HOST}`)));
    });

    client.on("error", (error) => {
      finalize(() => rejectPromise(error));
    });

    const request = client.request({
      ":method": "POST",
      ":path": `/3/device/${pushToken}`,
      "apns-topic": env.APPLE_PASS_TYPE_IDENTIFIER,
      "content-type": "application/json",
    });

    request.setEncoding("utf8");
    request.setTimeout(5000, () => {
      finalize(() => rejectPromise(new Error(`Timed out sending APNS update to ${pushToken}`)));
    });

    request.on("response", (headers) => {
      statusCode = Number(headers[":status"] ?? 0);
    });

    request.on("data", (chunk) => {
      responseBody += chunk;
    });

    request.on("end", () => {
      finalize(() =>
        resolvePromise({
          body: responseBody,
          statusCode,
        }),
      );
    });

    request.on("error", (error) => {
      finalize(() => rejectPromise(error));
    });

    request.end("{}");
  });
}

async function sendWalletPassUpdateNotifications(
  customerId: string,
  registrations: Array<{
    device: {
      pushToken: string;
    };
    deviceLibraryIdentifier: string;
  }>,
) {
  await Promise.allSettled(
    registrations.map(async (registration) => {
      try {
        const response = await sendPushNotification(registration.device.pushToken);

        if (hasInvalidTokenReason(response.statusCode, response.body)) {
          await unregisterDeviceFromWalletPass(registration.deviceLibraryIdentifier, customerId);
        }
      } catch {
        // Ignore push transport failures so loyalty writes stay durable.
      }
    }),
  );
}

export async function authorizeWalletPassRequest(
  passTypeIdentifier: string,
  serialNumber: string,
  authorizationHeader?: string | null,
) {
  if (!isApplePassEnabled()) {
    return null;
  }

  if (!normalizePassTypeIdentifier(passTypeIdentifier)) {
    return null;
  }

  const customer = await prisma.customer.findUnique({
    where: { id: serialNumber },
  });

  if (!customer) {
    return null;
  }

  const token = parseAuthorizationToken(authorizationHeader);
  if (!token || token !== customer.appleAuthToken) {
    return null;
  }

  return customer;
}

export async function registerDeviceForWalletPass(
  deviceLibraryIdentifier: string,
  pushToken: string,
  customerId: string,
) {
  if (!isApplePassEnabled()) {
    return "existing" as const;
  }

  await prisma.appleDevice.upsert({
    where: { deviceLibraryIdentifier },
    update: {
      pushToken,
    },
    create: {
      deviceLibraryIdentifier,
      pushToken,
    },
  });

  const existingRegistration = await prisma.applePassRegistration.findUnique({
    where: {
      customerId_deviceLibraryIdentifier: {
        deviceLibraryIdentifier,
        customerId,
      },
    },
  });

  if (existingRegistration) {
    await prisma.applePassRegistration.update({
      where: { id: existingRegistration.id },
      data: {
        updatedAt: new Date(),
      },
    });

    return "existing" as const;
  }

  await prisma.applePassRegistration.create({
    data: {
      deviceLibraryIdentifier,
      customerId,
    },
  });

  return "created" as const;
}

export async function unregisterDeviceFromWalletPass(deviceLibraryIdentifier: string, customerId: string) {
  if (!isApplePassEnabled()) {
    return;
  }

  await prisma.applePassRegistration.deleteMany({
    where: {
      deviceLibraryIdentifier,
      customerId,
    },
  });

  const remainingRegistrations = await prisma.applePassRegistration.count({
    where: {
      deviceLibraryIdentifier,
    },
  });

  if (remainingRegistrations === 0) {
    await prisma.appleDevice.deleteMany({
      where: {
        deviceLibraryIdentifier,
      },
    });
  }
}

export async function listUpdatedPassSerialNumbers(
  deviceLibraryIdentifier: string,
  passTypeIdentifier: string,
  passesUpdatedSince?: string,
) {
  if (!isApplePassEnabled()) {
    return {
      lastUpdated: passesUpdatedSince ?? null,
      serialNumbers: [] as string[],
    };
  }

  if (!normalizePassTypeIdentifier(passTypeIdentifier)) {
    return {
      lastUpdated: null,
      serialNumbers: [] as string[],
    };
  }

  const updatedSinceDate = parseUpdateTag(passesUpdatedSince);

  const registrations = await prisma.applePassRegistration.findMany({
    where: {
      deviceLibraryIdentifier,
    },
    include: {
      customer: true,
    },
    orderBy: {
      customer: {
        updatedAt: "asc",
      },
    },
  });

  const matchingCustomers = registrations
    .map((registration) => registration.customer)
    .filter((customer) => (updatedSinceDate ? customer.updatedAt > updatedSinceDate : true));

  if (matchingCustomers.length === 0) {
    return {
      lastUpdated: passesUpdatedSince ?? null,
      serialNumbers: [] as string[],
    };
  }

  const latestUpdatedAt = matchingCustomers.at(-1)?.updatedAt ?? null;

  return {
    lastUpdated: latestUpdatedAt ? toUpdateTag(latestUpdatedAt) : (passesUpdatedSince ?? null),
    serialNumbers: matchingCustomers.map((customer) => customer.id),
  };
}

export async function touchWalletPassAndSendUpdate(customerId: string) {
  if (!isApplePassEnabled()) {
    return;
  }

  const customer = await prisma.customer.update({
    where: { id: customerId },
    data: {
      revision: {
        increment: 1,
      },
    },
    include: {
      appleRegistrations: {
        include: {
          device: true,
        },
      },
    },
  });

  if (customer.appleRegistrations.length === 0) {
    return;
  }

  await sendWalletPassUpdateNotifications(customer.id, customer.appleRegistrations);
}

export async function getWalletPassLastModified(customerId: string) {
  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
    select: {
      updatedAt: true,
    },
  });

  return customer?.updatedAt ?? null;
}
