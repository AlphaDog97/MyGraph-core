import { ManifestCategory, ManifestGraph } from "../domain/types";
import { Select, Space, Typography } from "antd";

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
    <Space size={8}>
      <Select
        size="small"
        value={categoryId}
        onChange={onCategoryChange}
        aria-label="Select category"
        style={{ minWidth: 170 }}
        options={categories.map((category) => ({ value: category.id, label: category.label }))}
      />

      <Typography.Text type="secondary">/</Typography.Text>

      <Select
        size="small"
        value={graphId}
        onChange={onGraphChange}
        aria-label="Select graph"
        style={{ minWidth: 170 }}
        options={graphs.map((graph) => ({ value: graph.id, label: graph.label }))}
      />
    </Space>
  );
}
