import { FormEvent, useState } from "react";
import { Alert, Button, Input, Space } from "antd";

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
      <Space direction="vertical" size={12} className="full-width">
        <Input.TextArea
          value={rawText}
          onChange={(event) => setRawText(event.target.value)}
          placeholder="粘贴 graph.json 内容（JSON 数组）"
          aria-label="Paste graph.json"
          autoSize={{ minRows: 8, maxRows: 18 }}
          className="inline-graph-loader-textarea"
        />
        {errorMessage ? <Alert type="error" message={errorMessage} showIcon /> : null}
        <Button htmlType="submit" loading={isLoading}>
          {isLoading ? "加载中…" : "加载图"}
        </Button>
      </Space>
    </form>
  );
}
