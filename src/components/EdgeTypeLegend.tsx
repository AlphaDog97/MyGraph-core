import { Card, List, Space, Typography } from "antd";
import { edgeTypeLegendItems } from "../domain/edgeTypes";

export default function EdgeTypeLegend() {
  const items = edgeTypeLegendItems();

  return (
    <Card size="small" title="Relations" style={{ minWidth: 180 }}>
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
    </Card>
  );
}
