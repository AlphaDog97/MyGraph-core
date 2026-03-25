import { ManifestCategory, ManifestGraph } from "../domain/types";

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
    <div className="graph-selector">
      <select
        className="selector-dropdown"
        value={categoryId}
        onChange={(e) => onCategoryChange(e.target.value)}
        aria-label="Select category"
      >
        {categories.map((category) => (
          <option key={category.id} value={category.id}>
            {category.label}
          </option>
        ))}
      </select>

      <span className="selector-sep">/</span>

      <select
        className="selector-dropdown"
        value={graphId}
        onChange={(e) => onGraphChange(e.target.value)}
        aria-label="Select graph"
      >
        {graphs.map((graph) => (
          <option key={graph.id} value={graph.id}>
            {graph.label}
          </option>
        ))}
      </select>
    </div>
  );
}
