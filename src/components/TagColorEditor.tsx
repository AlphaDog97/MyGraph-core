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
      <Space direction="vertical" size={12} style={{ width: "100%" }}>
        {tags.map((tag) => {
          const current = tagColors[tag];
          return (
            <div
              key={tag}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 12,
              }}
            >
              <Typography.Text>{tag}</Typography.Text>
              <Space size={4} wrap>
                {PRESET_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => onChange(tag, color)}
                    aria-label={`Set ${tag} to ${color}`}
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: 999,
                      background: color,
                      border: current === color ? "2px solid rgba(0,0,0,0.65)" : "1px solid transparent",
                      cursor: "pointer",
                    }}
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
