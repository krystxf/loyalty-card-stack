"use client";

import { Container, Stack } from "@chakra-ui/react";
import { startTransition, useState } from "react";

import { lookupCustomerAction, recordPurchaseAction, redeemRewardAction } from "@/lib/actions";
import { CustomerPanel } from "./admin/customer-panel";
import { ScannerPanel } from "./admin/scanner-panel";
import { type ActionKind, type Customer, defaultRewardThreshold, type LookupSource } from "./admin/types";
import { extractCustomerId } from "./admin/utils";

export function AdminConsole({ applePassEnabled }: { applePassEnabled: boolean }) {
  const [lastPayload, setLastPayload] = useState("");
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [rewardThreshold, setRewardThreshold] = useState(defaultRewardThreshold);
  const [quantity, setQuantity] = useState(1);
  const [status, setStatus] = useState("Scan a pass to load a customer.");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function loadCustomer(rawValue: string, source: LookupSource) {
    const customerId = extractCustomerId(rawValue);
    setLastPayload(rawValue);

    if (!customerId) {
      setErrorMessage("The scanned QR code did not contain a customer identifier.");
      setStatus("Try scanning again or paste a customer ID manually.");
      return;
    }

    setIsLookingUp(true);
    setErrorMessage(null);
    setStatus(
      source === "scanner" ? `Loading customer ${customerId} from scan...` : `Loading customer ${customerId}...`,
    );

    try {
      const payload = await lookupCustomerAction(customerId);

      if (!payload) {
        setCustomer(null);
        setErrorMessage("Customer not found");
        setStatus("Customer lookup failed.");
        return;
      }

      startTransition(() => {
        setCustomer(payload.customer);
        setRewardThreshold(payload.loyaltyRule.paidCoffeesPerFreeCoffee);
      });
      setStatus(`Loaded ${payload.customer.id}.`);
    } catch (error) {
      setCustomer(null);
      setErrorMessage(error instanceof Error ? error.message : "Unable to load customer");
      setStatus("Customer lookup failed.");
    } finally {
      setIsLookingUp(false);
    }
  }

  async function submitAction(kind: ActionKind) {
    if (!customer) {
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    setStatus(kind === "purchase" ? "Recording paid coffees..." : "Recording reward redemption...");

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
      setStatus(
        kind === "purchase"
          ? `Added ${quantity} paid coffee${quantity === 1 ? "" : "s"}.`
          : `Redeemed ${quantity} reward coffee${quantity === 1 ? "" : "s"}.`,
      );
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to record the action");
      setStatus("Action failed.");
    } finally {
      setIsSubmitting(false);
    }
  }

  function closeCustomer() {
    setCustomer(null);
    setLastPayload("");
    setQuantity(1);
    setErrorMessage(null);
    setStatus("Scan a pass to load a customer.");
  }

  return (
    <Container as="main" maxW="3xl" py={{ base: 6, md: 10 }}>
      <Stack gap={8}>
        {customer ? (
          <CustomerPanel
            applePassEnabled={applePassEnabled}
            customer={customer}
            isSubmitting={isSubmitting}
            onClose={closeCustomer}
            onQuantityChange={setQuantity}
            onSubmit={(kind) => void submitAction(kind)}
            quantity={quantity}
            rewardThreshold={rewardThreshold}
          />
        ) : (
          <ScannerPanel
            errorMessage={errorMessage}
            isLookingUp={isLookingUp}
            lastPayload={lastPayload}
            onLoadCustomer={(rawValue, source) => void loadCustomer(rawValue, source)}
            status={status}
          />
        )}
      </Stack>
    </Container>
  );
}
