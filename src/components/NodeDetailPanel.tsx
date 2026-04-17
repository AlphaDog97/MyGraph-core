import { useState, useEffect, useCallback } from "react";
import {
  Box,
  Button,
  HStack,
  Input,
  Select,
  Text,
  Textarea,
  VStack,
} from "@chakra-ui/react";
import { KnowledgeNode, KnowledgeNodeFile } from "../domain/types";

interface Props {
  node: KnowledgeNode;
  allNodeIds: string[];
  onClose: () => void;
  onSave: (updated: KnowledgeNodeFile) => void;
}

interface LinkDraft {
  target: string;
  type: string;
  label: string;
}

export default function NodeDetailPanel({ node, allNodeIds, onClose, onSave }: Props) {
  const [label, setLabel] = useState(node.label);
  const [description, setDescription] = useState(node.description);
  const [tagsText, setTagsText] = useState(node.tags.join(", "));
  const [links, setLinks] = useState<LinkDraft[]>(
    node.links.map((l) => ({ target: l.target, type: l.type, label: l.label ?? "" }))
  );

  useEffect(() => {
    setLabel(node.label);
    setDescription(node.description);
    setTagsText(node.tags.join(", "));
    setLinks(node.links.map((l) => ({ target: l.target, type: l.type, label: l.label ?? "" })));
  }, [node]);

  const handleLinkChange = useCallback((idx: number, field: keyof LinkDraft, value: string) => {
    setLinks((prev) => prev.map((item, index) => (index === idx ? { ...item, [field]: value } : item)));
  }, []);
  const addLink = useCallback(() => setLinks((prev) => [...prev, { target: "", type: "", label: "" }]), []);
  const removeLink = useCallback((idx: number) => setLinks((prev) => prev.filter((_, index) => index !== idx)), []);

  const handleSave = useCallback(() => {
    const tags = tagsText.split(",").map((t) => t.trim()).filter(Boolean);
    const cleanedLinks = links
      .filter((l) => l.target.trim() && l.type.trim())
      .map((l) => ({
        target: l.target.trim(),
        type: l.type.trim(),
        ...(l.label.trim() ? { label: l.label.trim() } : {}),
      }));

    const updated: KnowledgeNodeFile = {
      id: node.id,
      label: label.trim() || node.label,
      tags,
      ...(description.trim() ? { description: description.trim() } : {}),
      ...(cleanedLinks.length > 0 ? { links: cleanedLinks } : {}),
    };

    onSave(updated);
  }, [description, label, links, node.id, node.label, onSave, tagsText]);

  const otherNodeIds = allNodeIds.filter((id) => id !== node.id);

  return (
    <Box position="absolute" right={4} top={4} w="360px" maxH="calc(100% - 32px)" overflowY="auto" p={4} borderWidth="1px" borderRadius="md" bg="white">
      <HStack justify="space-between" mb={3}>
        <Text fontWeight="bold">Node details</Text>
        <Button size="sm" variant="ghost" onClick={onClose}>×</Button>
      </HStack>

      <VStack align="stretch" spacing={3}>
        <Box>
          <Text fontSize="xs" color="gray.500">ID</Text>
          <Text fontSize="sm">{node.id}</Text>
        </Box>
        <Box>
          <Text fontSize="xs" color="gray.500">Label</Text>
          <Input size="sm" value={label} onChange={(e) => setLabel(e.target.value)} />
        </Box>
        <Box>
          <Text fontSize="xs" color="gray.500">Description</Text>
          <Textarea size="sm" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
        </Box>
        <Box>
          <Text fontSize="xs" color="gray.500">Tags（逗号分隔）</Text>
          <Input size="sm" value={tagsText} onChange={(e) => setTagsText(e.target.value)} />
        </Box>
        <Box>
          <HStack justify="space-between" mb={2}>
            <Text fontSize="xs" color="gray.500">Links</Text>
            <Button size="xs" onClick={addLink}>+ Add link</Button>
          </HStack>
          <VStack align="stretch" spacing={2}>
            {links.map((link, idx) => (
              <HStack key={`${node.id}-link-${idx}`} spacing={2}>
                <Select size="sm" value={link.target} onChange={(e) => handleLinkChange(idx, "target", e.target.value)}>
                  <option value="">target…</option>
                  {otherNodeIds.map((id) => <option key={id} value={id}>{id}</option>)}
                </Select>
                <Input size="sm" value={link.type} onChange={(e) => handleLinkChange(idx, "type", e.target.value)} placeholder="type" />
                <Input size="sm" value={link.label} onChange={(e) => handleLinkChange(idx, "label", e.target.value)} placeholder="label" />
                <Button size="xs" colorScheme="red" variant="ghost" onClick={() => removeLink(idx)}>×</Button>
              </HStack>
            ))}
          </VStack>
        </Box>
      </VStack>

      <HStack justify="flex-end" mt={4}>
        <Button size="sm" colorScheme="blue" onClick={handleSave}>
          Save
        </Button>
      </HStack>
    </Box>
  );
}
