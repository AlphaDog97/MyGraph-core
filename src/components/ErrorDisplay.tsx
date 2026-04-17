import { Alert, Space, Typography } from "antd";

interface Props {
  error: string;
}

export default function ErrorDisplay({ error }: Props) {
  return (
    <div style={{ height: "100%", display: "grid", placeItems: "center", padding: 24 }}>
      <Alert
        type="error"
        showIcon
        style={{ maxWidth: 720 }}
        message="Dataset validation failed"
        description={
          <Space direction="vertical" size={8}>
            <Typography.Text style={{ whiteSpace: "pre-wrap" }}>{error}</Typography.Text>
            <Typography.Text>
              Check your files in <Typography.Text code>graph-data/nodes/</Typography.Text> and redeploy.
            </Typography.Text>
          </Space>
        }
      />
    </div>
  );
}
