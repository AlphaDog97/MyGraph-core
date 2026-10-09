import { CSSProperties } from "react";
import { Button, Modal, Space, Typography } from "antd";
import type { TagColorAssignment } from "../domain/types";

interface Props {
  tags: string[];
  tagColors: TagColorAssignment;
  onChange: (tag: string, color: string | undefined) => void;
  onClose: () => void;
}

const PRESET_COLORS = [
  "#ef5da8",
  "#f97316",
  "#eab308",
  "#22c55e",
  "#14b8a6",
  "#0ea5e9",
  "#6366f1",
  "#8b5cf6",
  "#d946ef",
  "#64748b",
];

export default function TagColorEditor({
  tags,
  tagColors,
  onChange,
  onClose,
}: Props) {
  return (
    <Modal
      open
      onCancel={onClose}
      footer={null}
      title="Tag palette"
      width={720}
      centered
      rootClassName="tag-color-editor-modal"
    >
      <Typography.Paragraph type="secondary" className="tag-color-editor-copy">
        Use a restrained palette to make important clusters easier to scan without
        overpowering the graph.
      </Typography.Paragraph>
      <Space direction="vertical" size={10} className="full-width">
        {tags.map((tag) => {
          const current = tagColors[tag];
          return (
            <div key={tag} className="tag-color-editor-row">
              <Typography.Text strong>{tag}</Typography.Text>
              <Space size={6} wrap>
                {PRESET_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => onChange(tag, color)}
                    aria-label={`Set ${tag} to ${color}`}
                    className={`tag-color-editor-swatch${
                      current === color ? " is-active" : ""
                    }`}
                    style={{ "--swatch-color": color } as CSSProperties}
                  />
                ))}
                <Button
                  size="small"
                  type={!current ? "primary" : "default"}
                  onClick={() => onChange(tag, undefined)}
                >
                  Default
                </Button>
              </Space>
            </div>
          );
        })}
      </Space>
    </Modal>
  );
}
