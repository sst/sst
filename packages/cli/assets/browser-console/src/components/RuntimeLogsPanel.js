import Ansi from "ansi-to-react";
import Button from "./Button";
import "./RuntimeLogsPanel.scss";

export default function RuntimeLogsPanel({
  loading,
  loadError,
  logs,
  onClear,
}) {
  const hasLogs = logs && logs.length > 0;

  return (
    <div className="RuntimeLogsPanel">
      <div className="header">
        <span>Logs</span>
        <Button variant="link" size="sm" disabled={!hasLogs} onClick={onClear}>
          Clear
        </Button>
      </div>
      <div className="content">
        {loading && <p>Loading...</p>}
        {loadError && <p>Failed to Load!</p>}
        {!loading && !loadError && logs && (
          <>
            {!hasLogs && <p>Listening for logs...</p>}
            {hasLogs && (
              <pre>
                {logs.map((log, key) => (
                  <Ansi key={key}>{log.message}</Ansi>
                ))}
              </pre>
            )}
          </>
        )}
      </div>
    </div>
  );
}
