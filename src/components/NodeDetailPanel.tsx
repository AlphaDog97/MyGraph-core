import { useState, useEffect, useCallback } from "react";
import { KnowledgeNode, KnowledgeNodeFile } from "../domain/types";

interface Props {
  node: KnowledgeNode;
  allNodeIds: string[];
  onClose: () => void;
  onSave: (updated: KnowledgeNodeFile) => void;
  saveBusy: boolean;
}

interface LinkDraft {
  target: string;
  type: string;
  label: string;
}

export default function NodeDetailPanel({
  node,
  allNodeIds,
  onClose,
  onSave,
  saveBusy,
}: Props) {
  const [label, setLabel] = useState(node.label);
  const [description, setDescription] = useState(node.description);
  const [tagsText, setTagsText] = useState(node.tags.join(", "));
  const [links, setLinks] = useState<LinkDraft[]>(
    node.links.map((l) => ({
      target: l.target,
      type: l.type,
      label: l.label ?? "",
    }))
  );

  useEffect(() => {
    setLabel(node.label);
    setDescription(node.description);
    setTagsText(node.tags.join(", "));
    setLinks(
      node.links.map((l) => ({
        target: l.target,
        type: l.type,
        label: l.label ?? "",
      }))
    );
  }, [node]);

  const handleLinkChange = useCallback(
    (idx: number, field: keyof LinkDraft, value: string) => {
      setLinks((prev) => {
        const next = [...prev];
        next[idx] = { ...next[idx], [field]: value };
        return next;
      });
    },
    []
  );

  const addLink = useCallback(() => {
    setLinks((prev) => [...prev, { target: "", type: "", label: "" }]);
  }, []);

  const removeLink = useCallback((idx: number) => {
    setLinks((prev) => prev.filter((_, i) => i !== idx));
  }, []);

  const handleSave = useCallback(() => {
    if (saveBusy) return;
    const tags = tagsText
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    const cleanedLinks = links
      .filter((l) => l.target.trim() && l.type.trim())
      .map((l) => ({
        target: l.target.trim(),
        type: l.type.trim(),
        ...(l.label.trim() ? { label: l.label.trim() } : {}),
      }));

    const updated: KnowledgeNodeFile = {
      id: node.id,
      label: label.trim() || node.label,
      tags,
      ...(description.trim() ? { description: description.trim() } : {}),
      ...(cleanedLinks.length > 0 ? { links: cleanedLinks } : {}),
    };

    onSave(updated);
  }, [node.id, node.label, label, description, tagsText, links, onSave, saveBusy]);

  const otherNodeIds = allNodeIds.filter((id) => id !== node.id);

  return (
    <div className="detail-panel">
      <div className="detail-header">
        <h2 className="detail-title">Node details</h2>
        <button
          className="editor-close"
          onClick={onClose}
          aria-label="Close"
        >
          ×
        </button>
      </div>

      <div className="detail-body">
        <div className="detail-field">
          <label className="detail-label">ID</label>
          <div className="detail-readonly">{node.id}</div>
        </div>

        <div className="detail-field">
          <label className="detail-label" htmlFor="detail-label">
            Label
          </label>
          <input
            id="detail-label"
            className="detail-input"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
          />
        </div>

        <div className="detail-field">
          <label className="detail-label" htmlFor="detail-desc">
            Description
          </label>
          <textarea
            id="detail-desc"
            className="detail-textarea"
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <div className="detail-field">
          <label className="detail-label" htmlFor="detail-tags">
            Tags
            <span className="detail-hint">comma-separated</span>
          </label>
          <input
            id="detail-tags"
            className="detail-input"
            value={tagsText}
            onChange={(e) => setTagsText(e.target.value)}
            placeholder="e.g. frontend, tooling"
          />
        </div>

        <div className="detail-field">
          <div className="detail-label-row">
            <label className="detail-label">Links</label>
            <button className="detail-add-btn" onClick={addLink}>
              + Add link
            </button>
          </div>
          {links.length === 0 && (
            <div className="detail-empty">No outbound links.</div>
          )}
          {links.map((link, idx) => (
            <div key={idx} className="detail-link-row">
              <select
                className="detail-select"
                value={link.target}
                onChange={(e) =>
                  handleLinkChange(idx, "target", e.target.value)
                }
              >
                <option value="">target…</option>
                {otherNodeIds.map((id) => (
                  <option key={id} value={id}>
                    {id}
                  </option>
                ))}
              </select>
              <input
                className="detail-input detail-input-sm"
                value={link.type}
                onChange={(e) =>
                  handleLinkChange(idx, "type", e.target.value)
                }
                placeholder="type"
              />
              <input
                className="detail-input detail-input-sm"
                value={link.label}
                onChange={(e) =>
                  handleLinkChange(idx, "label", e.target.value)
                }
                placeholder="label"
              />
              <button
                className="detail-remove-btn"
                onClick={() => removeLink(idx)}
                aria-label="Remove link"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="detail-footer">
        <button className="btn btn-primary" onClick={handleSave} disabled={saveBusy}>
          {saveBusy ? "Saving..." : "Save"}
        </button>
      </div>
    </div>
  );
}
