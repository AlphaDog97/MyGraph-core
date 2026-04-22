import { EllipsisOutlined } from "@ant-design/icons";
import { Button, Dropdown } from "antd";
import type { MenuProps } from "antd";
import type { SizeType } from "antd/es/config-provider/SizeContext";
import { Manifest } from "../domain/types";

interface Props {
  manifest: Manifest;
  categoryId: string;
  graphId: string;
  onMove: (targetCategoryId: string) => void;
  onDelete: () => void;
  size?: SizeType;
}

export default function GraphManagementMenu({
  manifest,
  categoryId,
  graphId,
  onMove,
  onDelete,
  size = "middle",
}: Props) {
  const otherCategories = manifest.categories.filter((c) => c.id !== categoryId);

  const items: MenuProps["items"] = [
    ...otherCategories.map((category) => ({
      key: `move-${category.id}`,
      label: `Move to ${category.label}`,
      onClick: () => onMove(category.id),
    })),
    ...(otherCategories.length > 0 ? [{ type: "divider" as const }] : []),
    {
      key: "delete",
      label: `Delete graph "${graphId}"`,
      danger: true,
      onClick: onDelete,
    },
  ];

  return (
    <Dropdown menu={{ items }} trigger={["click"]}>
      <Button size={size} icon={<EllipsisOutlined />} aria-label="Graph actions" />
    </Dropdown>
  );
}
