import { CSSProperties } from "react";
import { DownOutlined, RightOutlined } from "@ant-design/icons";
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
          <span className="legend-card__title-wrap">
            <span>Relations</span>
            <span className="legend-card__count">{items.length}</span>
          </span>
          {collapsed ? <RightOutlined /> : <DownOutlined />}
        </button>
      }
    >
      {!collapsed && (
        <List
          size="small"
          className="legend-card__list"
          dataSource={items}
          renderItem={(item) => (
            <List.Item className="legend-card__item">
              <Space size={8}>
                <span
                  className="legend-card__swatch legend-card__swatch--relation"
                  style={{ "--legend-swatch-color": item.color } as CSSProperties}
                />
                <Typography.Text className="legend-card__label">
                  {item.type}
                </Typography.Text>
              </Space>
            </List.Item>
          )}
        />
      )}
    </Card>
  );
}
