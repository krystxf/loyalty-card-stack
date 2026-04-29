import { NextResponse } from "next/server";

import { listUpdatedPassSerialNumbers } from "@/lib/apple-pass-updates";
import { isApplePassEnabled } from "@/lib/wallet-features";

export const runtime = "nodejs";

type Params = Promise<{
  deviceLibraryIdentifier: string;
  passTypeIdentifier: string;
}>;

export async function GET(request: Request, { params }: { params: Params }) {
  if (!isApplePassEnabled()) {
    return NextResponse.json({ message: "Apple Wallet support is disabled" }, { status: 404 });
  }

  const { deviceLibraryIdentifier, passTypeIdentifier } = await params;
  const passesUpdatedSince = new URL(request.url).searchParams.get("passesUpdatedSince") ?? undefined;

  const result = await listUpdatedPassSerialNumbers(deviceLibraryIdentifier, passTypeIdentifier, passesUpdatedSince);

  return NextResponse.json({
    lastUpdated: result.lastUpdated,
    serialNumbers: result.serialNumbers,
  });
}
