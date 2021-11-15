import { useRef, useLayoutEffect } from "react";
import Ansi from "ansi-to-react";
import Button from "./Button";
import LoadingSpinner from "./LoadingSpinner";
import "./RuntimeLogsPanel.scss";

export default function RuntimeLogsPanel({
  loading,
  loadError,
  logs,
  onClear,
}) {
  const scrollEl = useRef(null);
  const oldScrollHeight = useRef(null);
  const oldClientHeight = useRef(null);

  const hasLogs = logs && logs.length > 0;

  const logsCount = logs ? logs.length : undefined;

  useLayoutEffect(() => {
    if (logsCount === undefined) {
      return;
    }

    const el = scrollEl.current;

    function wasAtBottom() {
      // Use current scroll position vs old heights
      return (
        oldScrollHeight.current - el.scrollTop - oldClientHeight.current < 1
      );
    }
    function scrollToBottom() {
      el.scrollTop = el.scrollHeight;
    }

    if (oldScrollHeight.current === null || wasAtBottom()) {
      scrollToBottom();
    }

    // Save old heights
    oldScrollHeight.current = el.scrollHeight;
    oldClientHeight.current = el.clientHeight;
  }, [logsCount]);

  return (
    <div className="RuntimeLogsPanel">
      <div className="header">
        <span>Logs</span>
        <Button variant="link" size="sm" disabled={!hasLogs} onClick={onClear}>
          Clear
        </Button>
      </div>
      <div ref={scrollEl} className="content">
        {loading && <LoadingSpinner />}
        {loadError && <p className="error">Failed to load</p>}
        {!loading && !loadError && logs && (
          <>
            {!hasLogs && <p className="loading">Listening for logs...</p>}
            {hasLogs &&
              logs.map((log, key) => (
                <pre key={key}>
                  <Ansi>{log.message}</Ansi>
                </pre>
              ))}
          </>
        )}
      </div>
    </div>
  );
}
