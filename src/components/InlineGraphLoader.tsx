import { FormEvent, useState } from "react";

interface Props {
  onLoad: (rawText: string) => Promise<void> | void;
  isLoading?: boolean;
  errorMessage?: string | null;
}

export default function InlineGraphLoader({
  onLoad,
  isLoading = false,
  errorMessage,
}: Props) {
  const [rawText, setRawText] = useState("");

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await onLoad(rawText);
  };

  return (
    <form className="inline-graph-loader" onSubmit={handleSubmit}>
      <textarea
        className="inline-graph-loader-input"
        value={rawText}
        onChange={(event) => setRawText(event.target.value)}
        placeholder="粘贴 graph.json 内容（JSON 数组）"
        aria-label="Paste graph.json"
      />
      <div className="inline-graph-loader-actions">
        <button className="btn btn-secondary" type="submit" disabled={isLoading}>
          {isLoading ? "加载中…" : "加载图"}
        </button>
        {errorMessage ? (
          <p className="inline-graph-loader-error" role="alert">
            {errorMessage}
          </p>
        ) : null}
      </div>
    </form>
  );
}
