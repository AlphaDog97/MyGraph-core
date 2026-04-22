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
            <List.Item style={{ paddingInline: 0 }}>
              <Space size={8}>
                <span
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: 999,
                    background: item.color,
                    display: "inline-block",
                  }}
                />
                <Typography.Text style={{ fontSize: 12 }}>{item.type}</Typography.Text>
              </Space>
            </List.Item>
          )}
        />
      )}
    </Card>
  );
}
