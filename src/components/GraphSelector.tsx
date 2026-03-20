import { Manifest } from "../domain/types";

interface Props {
  manifest: Manifest;
  categoryId: string;
  graphId: string;
  onCategoryChange: (categoryId: string) => void;
  onGraphChange: (graphId: string) => void;
}

export default function GraphSelector({
  manifest,
  categoryId,
  graphId,
  onCategoryChange,
  onGraphChange,
}: Props) {
  const category = manifest.categories.find((c) => c.id === categoryId);

  return (
    <div className="graph-selector">
      <select
        className="selector-dropdown"
        value={categoryId}
        onChange={(e) => onCategoryChange(e.target.value)}
        aria-label="Select category"
      >
        {manifest.categories.map((c) => (
          <option key={c.id} value={c.id}>
            {c.label}
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
        {category?.graphs.map((g) => (
          <option key={g.id} value={g.id}>
            {g.label}
          </option>
        ))}
      </select>
    </div>
  );
}
