"use client";

import { Container, Stack } from "@chakra-ui/react";
import { useRouter } from "next/navigation";
import { startTransition, useState } from "react";

import { recordPurchaseAction, redeemRewardAction } from "@/lib/actions";
import { CustomerPanel } from "./customer-panel";
import type { ActionKind, Customer } from "./types";

export function CustomerConsole({
  applePassEnabled,
  googleWalletEnabled,
  initialCustomer,
  initialRewardThreshold,
}: {
  applePassEnabled: boolean;
  googleWalletEnabled: boolean;
  initialCustomer: Customer;
  initialRewardThreshold: number;
}) {
  const router = useRouter();
  const [customer, setCustomer] = useState(initialCustomer);
  const [rewardThreshold, setRewardThreshold] = useState(initialRewardThreshold);
  const [quantity, setQuantity] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submitAction(kind: ActionKind) {
    setIsSubmitting(true);

    try {
      const action = kind === "purchase" ? recordPurchaseAction : redeemRewardAction;
      const payload = await action({
        customerId: customer.id,
        count: quantity,
      });

      startTransition(() => {
        setCustomer(payload.customer);
        setRewardThreshold(payload.loyaltyRule.paidCoffeesPerFreeCoffee);
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  function backToScanner() {
    router.push("/admin");
  }

  return (
    <Container as="main" maxW="3xl" py={{ base: 6, md: 10 }}>
      <Stack gap={8}>
        <CustomerPanel
          applePassEnabled={applePassEnabled}
          customer={customer}
          googleWalletEnabled={googleWalletEnabled}
          isSubmitting={isSubmitting}
          onClose={backToScanner}
          onQuantityChange={setQuantity}
          onSubmit={(kind) => void submitAction(kind)}
          quantity={quantity}
          rewardThreshold={rewardThreshold}
        />
      </Stack>
    </Container>
  );
}
