import {
  Button,
  HStack,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  ModalOverlay,
  Text,
  VStack,
} from "@chakra-ui/react";
import { TagColorAssignment } from "../domain/types";

interface Props {
  tags: string[];
  tagColors: TagColorAssignment;
  onChange: (tag: string, color: string | undefined) => void;
  onClose: () => void;
}

const PRESET_COLORS = [
  "#e53e3e", "#dd6b20", "#d69e2e", "#38a169",
  "#319795", "#3182ce", "#5a67d8", "#805ad5",
  "#d53f8c", "#718096",
];

export default function TagColorEditor({
  tags,
  tagColors,
  onChange,
  onClose,
}: Props) {
  return (
    <Modal isOpen onClose={onClose} size="lg">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Edit tag colors</ModalHeader>
        <ModalCloseButton />
        <ModalBody pb={4}>
          <VStack align="stretch" spacing={3}>
            {tags.map((tag) => {
              const current = tagColors[tag];
              return (
                <HStack key={tag} justify="space-between" align="center">
                  <Text fontSize="sm">{tag}</Text>
                  <HStack spacing={1}>
                    {PRESET_COLORS.map((color) => (
                      <Button
                        key={color}
                        size="xs"
                        minW="20px"
                        h="20px"
                        p={0}
                        borderRadius="full"
                        bg={color}
                        borderWidth={current === color ? "2px" : "1px"}
                        borderColor={current === color ? "blackAlpha.700" : "transparent"}
                        onClick={() => onChange(tag, color)}
                        aria-label={`Set ${tag} to ${color}`}
                      />
                    ))}
                    <Button size="xs" variant={!current ? "solid" : "outline"} onClick={() => onChange(tag, undefined)}>
                      清除
                    </Button>
                  </HStack>
                </HStack>
              );
            })}
          </VStack>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
}
