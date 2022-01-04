import { useState } from "react";
import Ansi from "ansi-to-react";
import Button from "./Button";
import "./RuntimeLogPanel.scss";

export default function RuntimeLogPanel({ log }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const metadata = log.metadata && JSON.parse(log.metadata);
  const metadataType = getMetadataType();

  function getMetadataType() {
    if (!metadata) {
      return;
    }
    if (metadata.event) {
      return "event";
    }
    if (metadata.response) {
      return "response";
    }
  }

  return (
    <pre>
      <Ansi>{log.message}</Ansi>
      {metadata && (
        <Button
          variant="link"
          size="sm"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          {isExpanded ? `hide ${metadataType}` : `show ${metadataType}`}
        </Button>
      )}
      {metadata && isExpanded && (
        <div>
          <Ansi>{JSON.stringify(metadata, null, 2)}</Ansi>
        </div>
      )}
    </pre>
  );
}
