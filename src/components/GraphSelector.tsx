import { ManifestCategory, ManifestGraph } from "../domain/types";
import { HStack, Select, Text } from "@chakra-ui/react";

interface Props {
  categories: ManifestCategory[];
  graphs: ManifestGraph[];
  categoryId: string;
  graphId: string;
  onCategoryChange: (categoryId: string) => void;
  onGraphChange: (graphId: string) => void;
}

export default function GraphSelector({
  categories,
  graphs,
  categoryId,
  graphId,
  onCategoryChange,
  onGraphChange,
}: Props) {
  return (
    <HStack spacing={2}>
      <Select
        size="sm"
        value={categoryId}
        onChange={(event) => onCategoryChange(event.target.value)}
        aria-label="Select category"
        minW="170px"
      >
        {categories.map((category) => (
          <option key={category.id} value={category.id}>
            {category.label}
          </option>
        ))}
      </Select>

      <Text color="gray.500">/</Text>

      <Select
        size="sm"
        value={graphId}
        onChange={(event) => onGraphChange(event.target.value)}
        aria-label="Select graph"
        minW="170px"
      >
        {graphs.map((graph) => (
          <option key={graph.id} value={graph.id}>
            {graph.label}
          </option>
        ))}
      </Select>
    </HStack>
  );
}
