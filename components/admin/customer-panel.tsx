import { Box, Button, Card, Heading, SimpleGrid, Stack, Text } from "@chakra-ui/react";
import NextLink from "next/link";

import { ActionBox } from "./action-box";
import { EventHistory } from "./event-history";
import { StatCard } from "./stat-card";
import type { ActionKind, Customer } from "./types";

export function CustomerPanel({
  applePassEnabled,
  customer,
  isSubmitting,
  onClose,
  onQuantityChange,
  onSubmit,
  quantity,
  rewardThreshold,
}: {
  applePassEnabled: boolean;
  customer: Customer;
  isSubmitting: boolean;
  onClose: () => void;
  onQuantityChange: (next: number) => void;
  onSubmit: (kind: ActionKind) => void;
  quantity: number;
  rewardThreshold: number;
}) {
  return (
    <Card.Root>
      <Card.Body gap={5}>
        <Box>
          <Text fontSize="xs" textTransform="uppercase" letterSpacing="wider" color="fg.muted">
            Customer
          </Text>
          <Heading size="lg">{customer.id}</Heading>
        </Box>

        <Stack gap={5}>
          <SimpleGrid columns={{ base: 2, md: 4 }} gap={3}>
            <StatCard label="Progress" value={`${customer.stampsInCycle}/${rewardThreshold}`} />
            <StatCard highlight={customer.rewardsAvailable > 0} label="Rewards ready" value={customer.rewardsAvailable} />
            <StatCard label="Paid coffees" value={customer.totalPaidCoffees} />
            <StatCard label="Free redeemed" value={customer.totalFreeRedeemed} />
          </SimpleGrid>

          {applePassEnabled ? (
            <Button asChild size="sm" variant="outline">
              <NextLink href={`/api/customers/${customer.id}/apple-pass`} target="_blank" rel="noreferrer">
                Apple Wallet pass
              </NextLink>
            </Button>
          ) : null}

          <ActionBox
            isSubmitting={isSubmitting}
            onQuantityChange={onQuantityChange}
            onSubmit={onSubmit}
            quantity={quantity}
            rewardsAvailable={customer.rewardsAvailable}
          />

          <EventHistory events={customer.coffeeEvents} />

          <Button colorPalette="gray" onClick={onClose} size="lg" variant="solid">
            Done — back to scanner
          </Button>
        </Stack>
      </Card.Body>
    </Card.Root>
  );
}
