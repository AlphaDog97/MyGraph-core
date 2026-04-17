import { TagColorAssignment } from "../domain/types";
import { Box, HStack, List, ListItem, Text, VStack } from "@chakra-ui/react";

interface Props {
  tags: string[];
  tagColors: TagColorAssignment;
}

const DEFAULT_SWATCH = "#b0b0b0";

export default function TagLegend({ tags, tagColors }: Props) {
  if (tags.length === 0) return null;

  return (
    <VStack
      align="stretch"
      spacing={2}
      p={3}
      borderWidth="1px"
      borderRadius="md"
      bg="whiteAlpha.900"
      minW="180px"
    >
      <Text fontSize="sm" fontWeight="semibold">
        Tags
      </Text>
      <List spacing={1}>
        {tags.map((tag) => {
          const color = tagColors[tag] ?? DEFAULT_SWATCH;
          return (
            <ListItem key={tag}>
              <HStack spacing={2}>
                <Box w="10px" h="10px" borderRadius="full" bg={color} />
                <Text fontSize="xs">{tag}</Text>
              </HStack>
            </ListItem>
          );
        })}
      </List>
    </VStack>
  );
}
