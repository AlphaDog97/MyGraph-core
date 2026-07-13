import {
  ApartmentOutlined,
  AppstoreOutlined,
  RightOutlined,
} from "@ant-design/icons";
import { Select } from "antd";
import type { SizeType } from "antd/es/config-provider/SizeContext";
import type { ManifestCategory, ManifestGraph } from "../domain/types";

interface Props {
  categories: ManifestCategory[];
  graphs: ManifestGraph[];
  categoryId: string;
  graphId: string;
  onCategoryChange: (categoryId: string) => void;
  onGraphChange: (graphId: string) => void;
  size?: SizeType;
  showGraphSelect?: boolean;
}

export default function GraphSelector({
  categories,
  graphs,
  categoryId,
  graphId,
  onCategoryChange,
  onGraphChange,
  size = "middle",
  showGraphSelect = true,
}: Props) {
  return (
    <div className="graph-selector" aria-label="Graph location">
      <div className="graph-selector__segment">
        <AppstoreOutlined className="graph-selector__icon" />
        <Select
          size={size}
          value={categoryId}
          onChange={onCategoryChange}
          aria-label="Select category"
          variant="borderless"
          popupMatchSelectWidth={false}
          className="graph-selector-item graph-selector-item--category"
          options={categories.map((category) => ({
            value: category.id,
            label: category.label,
          }))}
        />
      </div>

      {showGraphSelect && (
        <>
          <RightOutlined className="graph-selector__divider" />
          <div className="graph-selector__segment">
            <ApartmentOutlined className="graph-selector__icon" />
            <Select
              size={size}
              value={graphId}
              onChange={onGraphChange}
              aria-label="Select graph"
              variant="borderless"
              popupMatchSelectWidth={false}
              className="graph-selector-item graph-selector-item--graph"
              options={graphs.map((graph) => ({
                value: graph.id,
                label: graph.label,
              }))}
            />
          </div>
        </>
      )}
    </div>
  );
}
