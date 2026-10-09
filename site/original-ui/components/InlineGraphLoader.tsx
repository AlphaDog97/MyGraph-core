import { FormEvent, useState } from "react";
import { Alert, Button, Input, Space, Typography } from "antd";

interface Props {
  onLoad: (rawText: string) => Promise<void> | void;
  initialText?: string;
  isLoading?: boolean;
  errorMessage?: string | null;
}

export default function InlineGraphLoader({
  onLoad,
  initialText = "",
  isLoading = false,
  errorMessage,
}: Props) {
  const [rawText, setRawText] = useState(initialText);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await onLoad(rawText);
  };

  return (
    <form onSubmit={handleSubmit} className="inline-graph-loader">
      <Space direction="vertical" size={16} className="full-width">
        <div className="inline-graph-loader__header">
          <Typography.Title level={4}>Import graph JSON</Typography.Title>
          <Typography.Text type="secondary">
            Paste a node array or a category document to preview it locally.
          </Typography.Text>
        </div>
        <Input.TextArea
          value={rawText}
          onChange={(event) => setRawText(event.target.value)}
          placeholder="Paste graph.json content"
          aria-label="Paste graph.json"
          autoSize={{ minRows: 10, maxRows: 22 }}
          className="inline-graph-loader-textarea"
        />
        {errorMessage ? (
          <Alert type="error" message={errorMessage} showIcon />
        ) : null}
        <Button htmlType="submit" type="primary" block loading={isLoading}>
          {isLoading ? "Loading…" : "Load preview"}
        </Button>
      </Space>
    </form>
  );
}
