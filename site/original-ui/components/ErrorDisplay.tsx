import { Alert, Space, Typography } from "antd";

interface Props {
  error: string;
}

export default function ErrorDisplay({ error }: Props) {
  return (
    <div className="error-display">
      <Alert
        type="error"
        showIcon
        className="error-display-alert"
        message="Dataset validation failed"
        description={
          <Space direction="vertical" size={8}>
            <Typography.Text className="error-display-message">{error}</Typography.Text>
            <Typography.Text>
              Check your files in <Typography.Text code>graph-data/manifest.json</Typography.Text> and <Typography.Text code>graph-data/&lt;category&gt;/graph.json</Typography.Text>, then redeploy.
            </Typography.Text>
          </Space>
        }
      />
    </div>
  );
}
