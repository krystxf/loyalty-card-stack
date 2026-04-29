import { NextResponse } from "next/server";
import { z } from "zod";

import {
  authorizeWalletPassRequest,
  registerDeviceForWalletPass,
  unregisterDeviceFromWalletPass,
} from "@/lib/apple-pass-updates";
import { isApplePassEnabled } from "@/lib/wallet-features";

export const runtime = "nodejs";

const pushTokenBodySchema = z.object({
  pushToken: z.string().min(1),
});

type Params = Promise<{
  deviceLibraryIdentifier: string;
  passTypeIdentifier: string;
  serialNumber: string;
}>;

export async function POST(request: Request, { params }: { params: Params }) {
  if (!isApplePassEnabled()) {
    return NextResponse.json({ message: "Apple Wallet support is disabled" }, { status: 404 });
  }

  const { deviceLibraryIdentifier, passTypeIdentifier, serialNumber } = await params;
  const body = pushTokenBodySchema.parse(await request.json());

  const customer = await authorizeWalletPassRequest(
    passTypeIdentifier,
    serialNumber,
    request.headers.get("authorization"),
  );

  if (!customer) {
    return NextResponse.json({ message: "Request not authorized" }, { status: 401 });
  }

  const registrationState = await registerDeviceForWalletPass(deviceLibraryIdentifier, body.pushToken, customer.id);

  return new NextResponse(null, { status: registrationState === "created" ? 201 : 200 });
}

export async function DELETE(request: Request, { params }: { params: Params }) {
  if (!isApplePassEnabled()) {
    return NextResponse.json({ message: "Apple Wallet support is disabled" }, { status: 404 });
  }

  const { deviceLibraryIdentifier, passTypeIdentifier, serialNumber } = await params;

  const customer = await authorizeWalletPassRequest(
    passTypeIdentifier,
    serialNumber,
    request.headers.get("authorization"),
  );

  if (!customer) {
    return NextResponse.json({ message: "Request not authorized" }, { status: 401 });
  }

  await unregisterDeviceFromWalletPass(deviceLibraryIdentifier, customer.id);
  return new NextResponse(null, { status: 200 });
}
