import { CSSProperties } from "react";
import { Card, List, Space, Typography } from "antd";
import { TagColorAssignment } from "../domain/types";

interface Props {
  tags: string[];
  tagColors: TagColorAssignment;
  collapsed: boolean;
  onToggle: () => void;
}

const DEFAULT_SWATCH = "#b0b0b0";

export default function TagLegend({ tags, tagColors, collapsed, onToggle }: Props) {
  if (tags.length === 0) return null;

  return (
    <Card
      size="small"
      className={`legend-card${collapsed ? " legend-card--collapsed" : ""}`}
      title={
        <button
          type="button"
          className="legend-card__header-button"
          aria-expanded={!collapsed}
          onClick={onToggle}
        >
          Tags
        </button>
      }
    >
      {!collapsed && (
        <List
          size="small"
          dataSource={tags}
          renderItem={(tag) => {
            const color = tagColors[tag] ?? DEFAULT_SWATCH;
            return (
              <List.Item className="legend-card__item">
                <Space size={8}>
                  <span
                    className="legend-card__swatch"
                    style={{ "--legend-swatch-color": color } as CSSProperties}
                  />
                  <Typography.Text className="legend-card__label">{tag}</Typography.Text>
                </Space>
              </List.Item>
            );
          }}
        />
      )}
    </Card>
  );
}
