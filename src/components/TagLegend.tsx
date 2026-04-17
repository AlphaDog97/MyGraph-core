import { Card, List, Space, Typography } from "antd";
import { TagColorAssignment } from "../domain/types";

interface Props {
  tags: string[];
  tagColors: TagColorAssignment;
}

const DEFAULT_SWATCH = "#b0b0b0";

export default function TagLegend({ tags, tagColors }: Props) {
  if (tags.length === 0) return null;

  return (
    <Card size="small" title="Tags" style={{ minWidth: 180 }}>
      <List
        size="small"
        dataSource={tags}
        renderItem={(tag) => {
          const color = tagColors[tag] ?? DEFAULT_SWATCH;
          return (
            <List.Item style={{ paddingInline: 0 }}>
              <Space size={8}>
                <span
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: 999,
                    background: color,
                    display: "inline-block",
                  }}
                />
                <Typography.Text style={{ fontSize: 12 }}>{tag}</Typography.Text>
              </Space>
            </List.Item>
          );
        }}
      />
    </Card>
  );
}
