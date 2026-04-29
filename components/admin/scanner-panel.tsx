"use client";

import { Badge, Box, Button, Card, Field, Flex, Heading, Input, Stack, Text } from "@chakra-ui/react";
import dynamic from "next/dynamic";
import { useRef, useState } from "react";

import { type LookupSource, repeatedScanCooldownMs } from "./types";

const CameraScanner = dynamic(
  async () => {
    const module = await import("@yudiel/react-qr-scanner");
    return module.Scanner;
  },
  {
    ssr: false,
  },
);

export function ScannerPanel({
  errorMessage,
  isLookingUp,
  lastPayload,
  onLoadCustomer,
  status,
}: {
  errorMessage: string | null;
  isLookingUp: boolean;
  lastPayload: string;
  onLoadCustomer: (rawValue: string, source: LookupSource) => void;
  status: string;
}) {
  const [scanEnabled, setScanEnabled] = useState(true);
  const [manualCode, setManualCode] = useState("");
  const [scannerError, setScannerError] = useState<string | null>(null);
  const lastAcceptedScanRef = useRef<{ at: number; payload: string } | null>(null);

  return (
    <Card.Root>
      <Card.Body gap={5}>
        <Flex align="flex-start" justify="space-between" gap={3} wrap="wrap">
          <Box>
            <Text fontSize="xs" textTransform="uppercase" letterSpacing="wider" color="fg.muted">
              Scanner
            </Text>
            <Heading size="lg">Camera input</Heading>
          </Box>
          <Button onClick={() => setScanEnabled((current) => !current)} size="sm" variant="outline">
            {scanEnabled ? "Pause scanner" : "Resume scanner"}
          </Button>
        </Flex>

        <Box aspectRatio={1} bg="bg.subtle" borderRadius="lg" borderWidth="1px" overflow="hidden" position="relative">
          {scanEnabled ? (
            <CameraScanner
              constraints={{ facingMode: "environment" }}
              sound={false}
              onError={(error) => {
                setScannerError(error instanceof Error ? error.message : "Unable to access the camera");
              }}
              onScan={(detectedCodes) => {
                const rawValue = detectedCodes[0]?.rawValue?.trim();
                if (!rawValue) {
                  return;
                }

                const previousScan = lastAcceptedScanRef.current;
                const now = Date.now();
                if (
                  previousScan &&
                  previousScan.payload === rawValue &&
                  now - previousScan.at < repeatedScanCooldownMs
                ) {
                  return;
                }

                lastAcceptedScanRef.current = { at: now, payload: rawValue };
                onLoadCustomer(rawValue, "scanner");
              }}
            />
          ) : (
            <Flex align="center" justify="center" h="full" w="full">
              <Text color="fg.muted">Scanner paused</Text>
            </Flex>
          )}
        </Box>

        <form
          onSubmit={(event) => {
            event.preventDefault();
            onLoadCustomer(manualCode, "manual");
          }}
        >
          <Stack gap={3}>
            <Field.Root>
              <Field.Label>Manual lookup</Field.Label>
              <Input
                onChange={(event) => setManualCode(event.target.value)}
                placeholder="Paste a customer ID or QR payload"
                value={manualCode}
              />
            </Field.Root>
            <Button
              colorPalette="blue"
              disabled={!manualCode.trim() || isLookingUp}
              loading={isLookingUp}
              type="submit"
            >
              Load customer
            </Button>
          </Stack>
        </form>

        <Stack gap={2}>
          <Badge alignSelf="flex-start" colorPalette="gray" variant="subtle">
            {status}
          </Badge>
          {lastPayload ? (
            <Text color="fg.muted" fontSize="sm">
              Last payload: {lastPayload}
            </Text>
          ) : null}
          {scannerError ? (
            <Text color="red.500" fontSize="sm">
              Camera: {scannerError}
            </Text>
          ) : null}
          {errorMessage ? (
            <Text color="red.500" fontSize="sm">
              {errorMessage}
            </Text>
          ) : null}
        </Stack>
      </Card.Body>
    </Card.Root>
  );
}
