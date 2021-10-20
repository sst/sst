import Ansi from "ansi-to-react";
import { useState } from "react";
import Button from "./Button";
import ErrorAlert from "./ErrorAlert";
import LoadingSpinner from "./LoadingSpinner";
import CollapsiblePanel from "./CollapsiblePanel";
import "./StatusPanel.scss";

export default function StatusPanel({
  loading,
  loadError,
  infraBuildStatus,
  infraBuildErrors = [],
  infraDeployStatus,
  infraDeployErrors = [],
  infraCanDeploy,
  infraCanQueueDeploy,
  infraDeployQueued,
  lambdaBuildStatus,
  lambdaBuildErrors = [],
  handleDeploy,
}) {
  const [deploying, setDeploying] = useState(false);
  const [error, setError] = useState(null);

  //////////////
  // Callbacks
  //////////////

  async function onDeploy() {
    setDeploying(true);

    try {
      await handleDeploy();
    } catch (e) {
      setError(e);
    }

    setDeploying(false);
  }

  //////////////
  // Functions
  //////////////

  function buildCounts() {
    let errorCount = 0;
    let warningCount = 0;

    [...infraBuildErrors, ...infraDeployErrors, ...lambdaBuildErrors].forEach(
      (e) => {
        // adjust lint error count
        if (e.type === "lint") {
          const ret = e.message.match(
            /problems? \((\d+) errors?, (\d+) warnings?\)/
          );
          if (ret) {
            errorCount += parseInt(ret[1]);
            warningCount += parseInt(ret[2]);
          } else {
            errorCount++;
          }
        }
        // adjust type check error count
        else if (e.type === "type") {
          const ret = e.message.match(/Found (\d+) errors?./);
          if (ret) {
            errorCount += parseInt(ret[1]);
          } else {
            errorCount++;
          }
        } else {
          errorCount++;
        }
      }
    );

    return (
      <div>
        {errorCount > 0 && <span>{errorCount} ❌</span>}
        {warningCount > 0 && <span>{warningCount} ⚠️</span>}
      </div>
    );
  }

  function renderInfraStatus() {
    if (infraBuildStatus === undefined) {
      return;
    }

    return (
      <div>
        <h3>Infrastructure</h3>
        <pre>Build Status: {infraBuildStatus}</pre>
        {infraBuildErrors.map(({ type, message }, key) => (
          <pre key={key}>
            <h5>{type} error:</h5>
            <Ansi>{message}</Ansi>
          </pre>
        ))}
        <pre>Deploy Status: {infraDeployStatus}</pre>
        {infraDeployErrors.map(({ type, message }, key) => (
          <pre key={key}>
            <h5>{type} error:</h5>
            <Ansi>{message}</Ansi>
          </pre>
        ))}
      </div>
    );
  }

  function renderLambdaStatus() {
    if (lambdaBuildStatus === undefined) {
      return;
    }

    return (
      <div>
        <h3>Lambda</h3>
        <pre>Build Status: {lambdaBuildStatus}</pre>
        {lambdaBuildErrors.map(({ type, message }, key) => (
          <pre key={key}>
            <h5>{type} error:</h5>
            <Ansi>{message}</Ansi>
          </pre>
        ))}
      </div>
    );
  }

  function renderStatus() {
    let isEnabled;
    let copy;
    if (infraCanDeploy) {
      if (infraDeployStatus === "failed") {
        isEnabled = true;
        copy = "retry deploy";
      } else {
        isEnabled = true;
        copy = "deploy";
      }
    } else if (infraCanQueueDeploy) {
      isEnabled = true;
      copy = "queue deploy";
    } else if (infraDeployQueued) {
      isEnabled = false;
      copy = "deploy queued";
    } else {
      isEnabled = false;
      copy = "deploy";
    }
    return (
      <Button loading={deploying} disabled={!isEnabled} onClick={onDeploy}>
        {copy}
      </Button>
    );
  }

  function renderDeployButton() {
    const actions = [];
    if (infraBuildStatus === "building") {
      actions.push("building infrastructure");
    }
    if (infraDeployStatus === "deploying") {
      actions.push("deploying infrastructure");
    }
    if (lambdaBuildStatus === "building") {
      actions.push("building lambda");
    }

    if (actions.length > 0) {
      return (
        <span>
          <LoadingSpinner />
          {actions.join(" | ")}...
        </span>
      );
    }
  }

  return (
    <div className="StatusPanel">
      {error && <ErrorAlert message={error.message} />}
      {loading && <p>Loading...</p>}
      {loadError && <p>Failed to Load!</p>}
      {!loading && !loadError && (
        <div>
          {renderStatus()}
          {renderDeployButton()}
          <CollapsiblePanel type={""} name={buildCounts()}>
            <div>{renderInfraStatus()}</div>
            <div>{renderLambdaStatus()}</div>
          </CollapsiblePanel>
        </div>
      )}
    </div>
  );
}
