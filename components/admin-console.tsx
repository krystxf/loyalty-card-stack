"use client";

import { Container, Stack } from "@chakra-ui/react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { ScannerPanel } from "./admin/scanner-panel";
import type { LookupSource } from "./admin/types";
import { extractCustomerId } from "./admin/utils";

export function AdminConsole() {
  const router = useRouter();
  const [lastPayload, setLastPayload] = useState("");
  const [status, setStatus] = useState("Scan a pass to load a customer.");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function loadCustomer(rawValue: string, source: LookupSource) {
    const customerId = extractCustomerId(rawValue);
    setLastPayload(rawValue);

    if (!customerId) {
      setErrorMessage("The scanned QR code did not contain a customer identifier.");
      setStatus("Try scanning again or paste a customer ID manually.");
      return;
    }

    setErrorMessage(null);
    setStatus(
      source === "scanner" ? `Loading customer ${customerId} from scan...` : `Loading customer ${customerId}...`,
    );

    startTransition(() => {
      router.push(`/admin/${customerId}`);
    });
  }

  return (
    <Container as="main" maxW="3xl" py={{ base: 6, md: 10 }}>
      <Stack gap={8}>
        <ScannerPanel
          errorMessage={errorMessage}
          isLookingUp={isPending}
          lastPayload={lastPayload}
          onLoadCustomer={loadCustomer}
          status={status}
        />
      </Stack>
    </Container>
  );
}
