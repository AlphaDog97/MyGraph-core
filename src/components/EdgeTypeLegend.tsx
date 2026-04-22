import { CSSProperties } from "react";
import { Card, List, Space, Typography } from "antd";
import { edgeTypeLegendItems } from "../domain/edgeTypes";

interface Props {
  collapsed: boolean;
  onToggle: () => void;
}

export default function EdgeTypeLegend({ collapsed, onToggle }: Props) {
  const items = edgeTypeLegendItems();

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
          Relations
        </button>
      }
    >
      {!collapsed && (
        <List
          size="small"
          dataSource={items}
          renderItem={(item) => (
            <List.Item className="legend-card__item">
              <Space size={8}>
                <span
                  className="legend-card__swatch"
                  style={{ "--legend-swatch-color": item.color } as CSSProperties}
                />
                <Typography.Text className="legend-card__label">{item.type}</Typography.Text>
              </Space>
            </List.Item>
          )}
        />
      )}
    </Card>
  );
}
