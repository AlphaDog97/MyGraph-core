import {
  Button,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
  Text,
} from "@chakra-ui/react";
import { Manifest } from "../domain/types";

interface Props {
  manifest: Manifest;
  categoryId: string;
  graphId: string;
  onMove: (targetCategoryId: string) => void;
  onDelete: () => void;
}

export default function GraphManagementMenu({
  manifest,
  categoryId,
  graphId,
  onMove,
  onDelete,
}: Props) {
  const otherCategories = manifest.categories.filter((c) => c.id !== categoryId);

  return (
    <Menu>
      <MenuButton
        as={Button}
        size="sm"
        variant="outline"
        aria-label="Graph actions"
      >
        ⋯
      </MenuButton>
      <MenuList>
        {otherCategories.map((category) => (
          <MenuItem key={category.id} onClick={() => onMove(category.id)}>
            Move to {category.label}
          </MenuItem>
        ))}
        {otherCategories.length > 0 ? <Text px={3} py={1} color="gray.400">—</Text> : null}
        <MenuItem color="red.500" onClick={onDelete}>
          Delete graph "{graphId}"
        </MenuItem>
      </MenuList>
    </Menu>
  );
}
