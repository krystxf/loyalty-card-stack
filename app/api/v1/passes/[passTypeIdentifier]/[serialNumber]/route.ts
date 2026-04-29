import { NextResponse } from "next/server";

import { generateApplePass } from "@/lib/apple-pass";
import { authorizeWalletPassRequest, getWalletPassLastModified } from "@/lib/apple-pass-updates";
import { getApplePassCustomerData } from "@/lib/customer-snapshot";
import { isApplePassEnabled } from "@/lib/wallet-features";

export const runtime = "nodejs";

type Params = Promise<{
  passTypeIdentifier: string;
  serialNumber: string;
}>;

export async function GET(request: Request, { params }: { params: Params }) {
  if (!isApplePassEnabled()) {
    return NextResponse.json({ message: "Apple Wallet support is disabled" }, { status: 404 });
  }

  const { passTypeIdentifier, serialNumber } = await params;

  const authorizedCustomer = await authorizeWalletPassRequest(
    passTypeIdentifier,
    serialNumber,
    request.headers.get("authorization"),
  );

  if (!authorizedCustomer) {
    return NextResponse.json({ message: "Request not authorized" }, { status: 401 });
  }

  const lastModified = await getWalletPassLastModified(authorizedCustomer.id);
  const ifModifiedSince = request.headers.get("if-modified-since");

  if (lastModified && ifModifiedSince) {
    const modifiedSinceDate = new Date(ifModifiedSince);
    if (!Number.isNaN(modifiedSinceDate.getTime()) && lastModified <= modifiedSinceDate) {
      return new NextResponse(null, { status: 304 });
    }
  }

  const customer = await getApplePassCustomerData(authorizedCustomer.id);
  if (!customer) {
    return NextResponse.json({ message: "Pass not found" }, { status: 404 });
  }

  const passBuffer = await generateApplePass(customer);

  const headers: Record<string, string> = {
    "Cache-Control": "no-store",
    "Content-Type": "application/vnd.apple.pkpass",
  };
  if (lastModified) {
    headers["Last-Modified"] = lastModified.toUTCString();
  }

  return new NextResponse(new Uint8Array(passBuffer), { headers });
}
