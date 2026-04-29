"use client";

import { Box, Container, Flex, IconButton, Text } from "@chakra-ui/react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

export function Navbar() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isDark = mounted && resolvedTheme === "dark";
  const nextLabel = isDark ? "Switch to light mode" : "Switch to dark mode";

  return (
    <Box as="header" bg="bg.panel" borderBottomWidth="1px" position="sticky" top={0} zIndex="docked">
      <Container maxW="6xl">
        <Flex align="center" h={14} justify="space-between">
          <Text fontWeight="semibold">Wallet Pass Admin</Text>
          <IconButton
            aria-label={nextLabel}
            onClick={() => setTheme(isDark ? "light" : "dark")}
            size="sm"
            variant="ghost"
          >
            {mounted ? (isDark ? "☀" : "☾") : ""}
          </IconButton>
        </Flex>
      </Container>
    </Box>
  );
}
