import { TagColorAssignment } from "../domain/types";

interface Props {
  tags: string[];
  tagColors: TagColorAssignment;
}

const DEFAULT_SWATCH = "#b0b0b0";

export default function TagLegend({ tags, tagColors }: Props) {
  if (tags.length === 0) return null;

  return (
    <div className="legend-panel">
      <h3 className="legend-title">Tags</h3>
      <ul className="legend-list">
        {tags.map((tag) => {
          const color = tagColors[tag] ?? DEFAULT_SWATCH;
          return (
            <li key={tag} className="legend-item">
              <span
                className="legend-swatch"
                style={{ backgroundColor: color }}
              />
              <span className="legend-label">{tag}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
