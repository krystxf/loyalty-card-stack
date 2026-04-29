import { Box, Flex, Heading, Stack, Text } from "@chakra-ui/react";

import type { CoffeeEvent } from "./types";
import { formatEventType, formatTimestamp } from "./utils";

export function EventHistory({ events }: { events: CoffeeEvent[] }) {
  return (
    <Box>
      <Text color="fg.muted" fontSize="xs" letterSpacing="wider" textTransform="uppercase">
        Recent activity
      </Text>
      <Heading mb={3} size="md">
        Latest events
      </Heading>

      <Stack gap={2}>
        {events.length > 0 ? (
          events.map((event) => (
            <Flex
              align="center"
              borderRadius="md"
              borderWidth="1px"
              gap={3}
              justify="space-between"
              key={event.id}
              p={3}
            >
              <Box>
                <Text fontWeight="semibold">{formatEventType(event.type)}</Text>
                <Text color="fg.muted" fontSize="sm">
                  {formatTimestamp(event.createdAt)}
                </Text>
              </Box>
              <Box textAlign="right">
                <Text fontWeight="semibold">x{event.count}</Text>
              </Box>
            </Flex>
          ))
        ) : (
          <Text color="fg.muted" fontSize="sm">
            No events recorded yet.
          </Text>
        )}
      </Stack>
    </Box>
  );
}
