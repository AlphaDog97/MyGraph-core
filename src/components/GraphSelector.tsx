import { ManifestCategory, ManifestGraph } from "../domain/types";
import { Select, Space, Typography } from "antd";
import type { SizeType } from "antd/es/config-provider/SizeContext";

interface Props {
  categories: ManifestCategory[];
  graphs: ManifestGraph[];
  categoryId: string;
  graphId: string;
  onCategoryChange: (categoryId: string) => void;
  onGraphChange: (graphId: string) => void;
  size?: SizeType;
}

export default function GraphSelector({
  categories,
  graphs,
  categoryId,
  graphId,
  onCategoryChange,
  onGraphChange,
  size = "middle",
}: Props) {
  return (
    <Space size={8} className="graph-selector" align="center">
      <Select
        size={size}
        value={categoryId}
        onChange={onCategoryChange}
        aria-label="Select category"
        className="graph-selector-item"
        options={categories.map((category) => ({ value: category.id, label: category.label }))}
      />

      <Typography.Text type="secondary">/</Typography.Text>

      <Select
        size={size}
        value={graphId}
        onChange={onGraphChange}
        aria-label="Select graph"
        className="graph-selector-item"
        options={graphs.map((graph) => ({ value: graph.id, label: graph.label }))}
      />
    </Space>
  );
}
