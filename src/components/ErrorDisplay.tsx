interface Props {
  error: string;
}

export default function ErrorDisplay({ error }: Props) {
  return (
    <div className="error-container">
      <div className="error-card">
        <svg
          className="error-icon"
          width="32"
          height="32"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#e53e3e"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
        <h2 className="error-title">Dataset validation failed</h2>
        <pre className="error-detail">{error}</pre>
        <p className="error-hint">
          Check your files in <code>graph-data/nodes/</code> and redeploy.
        </p>
      </div>
    </div>
  );
}
