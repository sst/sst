import ConstructPanel from "./ConstructPanel";
import "./ConstructsPanel.scss";

export default function ConstructsPanel({
  loading,
  loadError,
  constructs,
  handleTrigger,
}) {
  return (
    <div className="ConstructsPanel">
      {loading && <p>Loading...</p>}
      {loadError && <p>Failed to Load!</p>}
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
