import { useState, useEffect } from "react";
import Ansi from "ansi-to-react";
import Spinner from "react-bootstrap/Spinner";
import Collapse from "react-bootstrap/Collapse";
import { XCircleFill, ExclamationTriangleFill } from "react-bootstrap-icons";
import Button from "./Button";
import ErrorAlert from "./ErrorAlert";
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
  let errorCount = 0;
  let warningCount = 0;

  const [open, setOpen] = useState(false);
  const [error, setError] = useState(null);
  const [deploying, setDeploying] = useState(false);

  const [isButtonEnabled, buttonCopy] = getButtonStatusCopy();

  const openCs = open ? "" : "collapsed";
  const enabledCs = isButtonEnabled ? "enabled" : "";

  useEffect(() => {
    if (infraBuildStatus === "building" || lambdaBuildStatus === "building") {
      setOpen(false);
    }
  }, [infraBuildStatus, lambdaBuildStatus]);

  if (!loading && !loadError) {
    [...infraBuildErrors, ...infraDeployErrors, ...lambdaBuildErrors].forEach(
      (e) => {
        errorCount += e.errorCount || 0;
        warningCount += e.warningCount || 0;
      }
    );
  }

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

  function getButtonStatusCopy() {
    let isEnabled;
    let copy;

    if (infraCanDeploy) {
      if (infraDeployStatus === "failed") {
        isEnabled = true;
        copy = "Retry";
      } else {
        isEnabled = true;
        copy = "Deploy";
      }
    } else if (infraCanQueueDeploy) {
      isEnabled = true;
      copy = "Queue";
    } else if (infraDeployQueued) {
      isEnabled = false;
      copy = "Queued";
    } else {
      isEnabled = false;
      copy = "Deploy";
    }

    return [isEnabled, copy];
  }

  function renderBuildCounts() {
    return (
      (errorCount > 0 || warningCount > 0) && (
        <div className="counts" onClick={() => setOpen(!open)}>
          {errorCount > 0 && (
            <span className="errors">
              <XCircleFill size={14} />
              <span>{errorCount}</span>
            </span>
          )}
          {warningCount > 0 && (
            <span className="warnings">
              <ExclamationTriangleFill size={14} />
              <span>{warningCount}</span>
            </span>
          )}
        </div>
      )
    );
  }

  function renderInfraStatus() {
    if (infraBuildStatus === undefined) {
      return;
    }

    return (
      (infraBuildErrors.length > 0 || infraDeployErrors.length > 0) && (
        <>
          <h3>
            <span>Infrastructure</span>
          </h3>
          {infraBuildErrors.length > 0 && (
            <div className="content">
              {infraBuildErrors.map(({ type, message }, key) => (
                <div key={key} className="error-type">
                  <h5>{type} Errors</h5>
                  <pre>
                    <Ansi>{message}</Ansi>
                  </pre>
                </div>
              ))}
            </div>
          )}
          {infraDeployErrors.length > 0 && (
            <div className="content">
              {infraDeployErrors.map(({ type, message }, key) => (
                <div key={key} className="error-type">
                  <h5>{type} Errors</h5>
                  <pre>
                    <Ansi>{message}</Ansi>
                  </pre>
                </div>
              ))}
            </div>
          )}
        </>
      )
    );
  }

  function renderLambdaStatus() {
    if (lambdaBuildStatus === undefined) {
      return;
    }

    return (
      lambdaBuildErrors.length > 0 && (
        <>
          <h3>
            <span>Functions</span>
          </h3>
          <div className="content">
            {lambdaBuildErrors.map(({ type, message }, key) => (
              <div key={key} className="error-type">
                <h5>{type} Errors</h5>
                <pre>
                  <Ansi>{message}</Ansi>
                </pre>
              </div>
            ))}
          </div>
        </>
      )
    );
  }

  function renderDeployButton() {
    return (
      <Button
        size="sm"
        onClick={onDeploy}
        loading={deploying}
        disabled={!isButtonEnabled}
        variant={isButtonEnabled ? "secondary" : "primary"}
      >
        {buttonCopy}
      </Button>
    );
  }

  function renderBuildSpinner() {
    const building =
      infraBuildStatus === "building" || lambdaBuildStatus === "building";
    const deploying = infraDeployStatus === "deploying";

    return (
      (building || deploying) && (
        <span className="spinner">
          <Spinner
            size="sm"
            animation="border"
            variant="secondary"
            role="status"
          >
            <span className="visually-hidden">Loading...</span>
          </Spinner>
          {building && <span className="building">Building</span>}
          {deploying && <span className="deploying">Deploying</span>}
        </span>
      )
    );
  }

  function renderWatcherMessage() {
    return (
      errorCount === 0 &&
      warningCount === 0 && (
        <div className="watcher-message">Watching changes&hellip;</div>
      )
    );
  }

  return (
    <div className={`StatusPanel ${openCs} ${enabledCs}`}>
      {error && <ErrorAlert message={error.message} />}
      {!loading && !loadError && (
        <Collapse in={open}>
          <div className="error-logs">
            <div>
              <div className="header">Errors</div>
              <div className="scroll-content">
                {renderInfraStatus()}
                {renderLambdaStatus()}
              </div>
            </div>
          </div>
        </Collapse>
      )}
      <div className="footer">
        <div className="status">
          {loading && <span>&nbsp;</span>}
          {loadError && <p className="error">Failed to load</p>}
          {!loading && !loadError && (
            <>
              {renderBuildCounts()}
              {renderWatcherMessage()}
            </>
          )}
        </div>
        <div className="controls">
          {renderBuildSpinner()}
          {renderDeployButton()}
        </div>
      </div>
    </div>
  );
}
