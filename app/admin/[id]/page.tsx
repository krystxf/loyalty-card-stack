import { notFound } from "next/navigation";

import { CustomerConsole } from "@/components/admin/customer-console";
import { buildCustomerResponse, getCustomerSnapshot } from "@/lib/customer-snapshot";
import { isApplePassEnabled } from "@/lib/wallet-features";

export default async function AdminCustomerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const customer = await getCustomerSnapshot(id);

  if (!customer) {
    notFound();
  }

  const response = buildCustomerResponse(customer);

  return (
    <CustomerConsole
      applePassEnabled={isApplePassEnabled()}
      initialCustomer={response.customer}
      initialRewardThreshold={response.loyaltyRule.paidCoffeesPerFreeCoffee}
    />
  );
}
