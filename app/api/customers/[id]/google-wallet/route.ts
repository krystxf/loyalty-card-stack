import { NextResponse } from "next/server";
import { getGoogleWalletCustomerData } from "@/lib/customer-snapshot";
import { prisma, WalletPassState } from "@/lib/db";
import { generateGoogleWalletSaveUrl } from "@/lib/google-wallet";
import { markGoogleWalletObjectCreated } from "@/lib/google-wallet-updates";
import { isGoogleWalletEnabled } from "@/lib/wallet-features";

export const runtime = "nodejs";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isGoogleWalletEnabled()) {
    return NextResponse.json({ message: "Google Wallet support is disabled" }, { status: 404 });
  }

  const { id } = await params;
  const customer = await getGoogleWalletCustomerData(id);
  if (!customer) {
    return NextResponse.json({ message: "Customer not found" }, { status: 404 });
  }

  try {
    const saveUrl = await generateGoogleWalletSaveUrl(customer);

    await Promise.all([
      markGoogleWalletObjectCreated(customer.id),
      prisma.customer.update({
        where: { id: customer.id },
        data: { state: WalletPassState.ACTIVE },
      }),
    ]);

    return NextResponse.redirect(saveUrl);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Unable to generate Google Wallet pass" },
      { status: 500 },
    );
  }
}
