import { CSSProperties } from "react";
import { Button, Modal, Space, Typography } from "antd";
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
    <Modal open onCancel={onClose} footer={null} title="Edit tag colors" width={680}>
      <Space direction="vertical" size={12} className="full-width">
        {tags.map((tag) => {
          const current = tagColors[tag];
          return (
            <div key={tag} className="tag-color-editor-row">
              <Typography.Text>{tag}</Typography.Text>
              <Space size={4} wrap>
                {PRESET_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => onChange(tag, color)}
                    aria-label={`Set ${tag} to ${color}`}
                    className={`tag-color-editor-swatch${current === color ? " is-active" : ""}`}
                    style={{ "--swatch-color": color } as CSSProperties}
                  />
                ))}
                <Button size="small" type={!current ? "primary" : "default"} onClick={() => onChange(tag, undefined)}>
                  清除
                </Button>
              </Space>
            </div>
          );
        })}
      </Space>
    </Modal>
  );
}
