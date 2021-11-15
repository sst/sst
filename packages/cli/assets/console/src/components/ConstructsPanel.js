import { ExclamationOctagonFill } from "react-bootstrap-icons";
import ConstructPanel from "./ConstructPanel";
import LoadingSpinner from "./LoadingSpinner";
import "./ConstructsPanel.scss";

export default function ConstructsPanel({
  loading,
  loadError,
  constructs,
  handleTrigger,
}) {
  const loadingCs = loading || loadError ? "loading" : "";

  return (
    <div className={`ConstructsPanel ${loadingCs}`}>
      {loading && <LoadingSpinner />}
      {loadError && (
        <div className="error">
          <ExclamationOctagonFill />
          <p>Failed to load</p>
        </div>
      )}
      {!loading &&
        !loadError &&
        constructs &&
        constructs.map((construct, key) => (
          <ConstructPanel
            key={key}
            construct={construct}
            handleTrigger={handleTrigger}
          />
        ))}
    </div>
  );
}
