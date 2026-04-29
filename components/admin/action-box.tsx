import { Box, Button, Flex, HStack, IconButton, Stack, Text } from "@chakra-ui/react";

import { type ActionKind, maxQuantity } from "./types";

export function ActionBox({
  isSubmitting,
  onQuantityChange,
  onSubmit,
  quantity,
  rewardsAvailable,
}: {
  isSubmitting: boolean;
  onQuantityChange: (next: number) => void;
  onSubmit: (kind: ActionKind) => void;
  quantity: number;
  rewardsAvailable: number;
}) {
  return (
    <Stack bg="bg.subtle" borderRadius="lg" borderWidth="1px" gap={4} p={4}>
      <Flex align="center" gap={3} justify="space-between" wrap="wrap">
        <Text fontWeight="medium">How many?</Text>
        <HStack gap={2}>
          <IconButton
            aria-label="Decrease quantity"
            disabled={quantity <= 1 || isSubmitting}
            onClick={() => onQuantityChange(Math.max(1, quantity - 1))}
            size="sm"
            variant="outline"
          >
            -
          </IconButton>
          <Box minW="10" textAlign="center">
            <Text fontSize="lg" fontWeight="bold">
              {quantity}
            </Text>
          </Box>
          <IconButton
            aria-label="Increase quantity"
            disabled={quantity >= maxQuantity || isSubmitting}
            onClick={() => onQuantityChange(Math.min(maxQuantity, quantity + 1))}
            size="sm"
            variant="outline"
          >
            +
          </IconButton>
        </HStack>
      </Flex>

      <Flex gap={3} wrap="wrap">
        <Button
          colorPalette="blue"
          disabled={isSubmitting}
          flex="1"
          loading={isSubmitting}
          onClick={() => onSubmit("purchase")}
        >
          Add paid coffees
        </Button>
        <Button
          colorPalette="green"
          disabled={isSubmitting || rewardsAvailable < quantity}
          flex="1"
          onClick={() => onSubmit("redeem")}
          variant="outline"
        >
          Redeem reward
        </Button>
      </Flex>
    </Stack>
  );
}
