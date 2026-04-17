import { edgeTypeLegendItems } from "../domain/edgeTypes";
import { Box, HStack, List, ListItem, Text, VStack } from "@chakra-ui/react";

export default function EdgeTypeLegend() {
  const items = edgeTypeLegendItems();

  return (
    <VStack
      align="stretch"
      spacing={2}
      p={3}
      borderWidth="1px"
      borderRadius="md"
      borderColor="var(--color-border)"
      bg="var(--color-elevated-bg)"
      color="var(--color-text)"
      minW="180px"
    >
      <Text fontSize="sm" fontWeight="semibold">
        Relations
      </Text>
      <List spacing={1}>
        {items.map((item) => (
          <ListItem key={item.type}>
            <HStack spacing={2}>
              <Box w="10px" h="10px" borderRadius="full" bg={item.color} />
              <Text fontSize="xs">{item.type}</Text>
            </HStack>
          </ListItem>
        ))}
      </List>
    </VStack>
  );
}
