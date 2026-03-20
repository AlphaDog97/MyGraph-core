import { TagColorAssignment } from "../domain/types";

interface Props {
  tags: string[];
  tagColors: TagColorAssignment;
  onChange: (tag: string, color: string | undefined) => void;
  onClose: () => void;
}

const PRESET_COLORS = [
  "#e53e3e", "#dd6b20", "#d69e2e", "#38a169",
  "#319795", "#3182ce", "#5a67d8", "#805ad5",
  "#d53f8c", "#718096",
];

export default function TagColorEditor({
  tags,
  tagColors,
  onChange,
  onClose,
}: Props) {
  return (
    <div className="editor-overlay" onClick={onClose}>
      <div className="editor-panel" onClick={(e) => e.stopPropagation()}>
        <div className="editor-header">
          <h2 className="editor-title">Edit tag colors</h2>
          <button className="editor-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        <div className="editor-body">
          {tags.map((tag) => {
            const current = tagColors[tag];
            return (
              <div key={tag} className="editor-row">
                <span className="editor-tag-name">{tag}</span>
                <div className="editor-colors">
                  {PRESET_COLORS.map((c) => (
                    <button
                      key={c}
                      className={`editor-color-btn${current === c ? " active" : ""}`}
                      style={{ backgroundColor: c }}
                      onClick={() => onChange(tag, c)}
                      aria-label={`Set ${tag} to ${c}`}
                    />
                  ))}
                  <button
                    className={`editor-color-btn editor-clear-btn${!current ? " active" : ""}`}
                    onClick={() => onChange(tag, undefined)}
                    aria-label={`Clear color for ${tag}`}
                    title="Clear"
                  >
                    ∅
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
