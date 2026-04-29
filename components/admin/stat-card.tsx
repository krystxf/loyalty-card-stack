import { Box, Text } from "@chakra-ui/react";

export function StatCard({
  highlight,
  label,
  value,
}: {
  highlight?: boolean;
  label: string;
  value: number | string;
}) {
  return (
    <Box
      bg={highlight ? "green.subtle" : "bg.subtle"}
      borderColor={highlight ? "green.emphasized" : undefined}
      borderRadius="md"
      borderWidth="1px"
      p={3}
    >
      <Text color={highlight ? "green.fg" : "fg.muted"} fontSize="xs" textTransform="uppercase">
        {label}
      </Text>
      <Text color={highlight ? "green.fg" : undefined} fontSize="xl" fontWeight="bold">
        {value}
      </Text>
    </Box>
  );
}
