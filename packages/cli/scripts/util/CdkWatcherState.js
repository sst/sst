"use strict";

const chalk = require("chalk");

// Setup logger
const { getChildLogger } = require("@serverless-stack/core");
const logger = getChildLogger("cdk-watcher-state");

const { parseLintOutput, parseTypeCheckOutput } = require("./cdkHelpers");
const array = require("../../lib/array");

module.exports = class CdkWaterState {
  constructor(config) {
    this.state = {
      inputFiles: [...config.inputFiles],

      // build
      needsReBuild: false,
      buildPromise: null,
      buildErrors: null,

      // checks & synth
      needsReCheck: false,
      lintProcess: null,
      lintHasError: null,
      lintOutput: config.initialLintOutput,
      typeCheckProcess: null,
      typeCheckErrorOutput: null,
      synthPromise: null,
      synthError: null,
      synthedChecksumData: null,
      /* note: 'lastDeployingChecksumData' stores the checksum data from the last
       *       time user tried to deploy. And everytime there's a new
       *       checksum value, we check against 'lastDeployingChecksumData' to
       *       determine if there are changes.
       *
       *       There are 3 strategies we can use to determine if there are changes:
       *       1. check against last synthed (see above)
       *       2. check against last deploying: the problem is if
       */
      lastDeployingChecksumData: config.initialChecksumData,

      // deploy
      needsReDeploy: false,
      userWillReDeploy: false,
      deployPromise: null,
      deployError: null,
      deployedManifest: null,
    };

    this.onReBuild = config.onReBuild;
    this.onLint = config.onLint;
    this.onTypeCheck = config.onTypeCheck;
    this.onSynth = config.onSynth;
    this.onReDeploy = config.onReDeploy;
    this.onAddWatchedFiles = config.onAddWatchedFiles;
    this.onRemoveWatchedFiles = config.onRemoveWatchedFiles;
    this.onStatusUpdated = config.onStatusUpdated;
  }

  //////////////////////
  // Public Functions //
  //////////////////////

  getStatus() {
    // Get build status
    let buildStatus;
    if (
      this.state.buildPromise ||
      this.state.lintProcess ||
      this.state.typeCheckProcess ||
      this.state.synthPromise
    ) {
      buildStatus = "building";
    } else if (
      this.state.buildErrors ||
      this.state.lintHasError ||
      this.state.typeCheckErrorOutput ||
      this.state.synthError
    ) {
      buildStatus = "failed";
    } else {
      buildStatus = "idle";
    }

    // Get build errors
    const buildErrors = [];
    if (this.state.buildErrors) {
      this.state.buildErrors.forEach((error) =>
        buildErrors.push({ type: "build", message: error, errorCount: 1 })
      );
    }
    if (this.state.lintOutput) {
      const lintRet = parseLintOutput(this.state.lintOutput);
      buildErrors.push({
        type: "lint",
        message: this.state.lintOutput,
        errorCount: lintRet.errorCount,
        warningCount: lintRet.warningCount,
      });
    }
    if (this.state.typeCheckErrorOutput) {
      const typeCheckRet = parseTypeCheckOutput(
        this.state.typeCheckErrorOutput
      );
      buildErrors.push({
        type: "type",
        message: this.state.typeCheckErrorOutput,
        errorCount: typeCheckRet.errorCount,
      });
    }
    this.state.synthError &&
      buildErrors.push({
        type: "synth",
        message: this.state.synthError,
        errorCount: 1,
      });

    // Get deploy status
    let deployStatus = "idle";
    const deployErrors = [];
    if (this.state.deployPromise) {
      deployStatus = "deploying";
    } else if (this.state.deployError) {
      deployStatus = "failed";
      deployErrors.push({
        type: "deploy",
        message: this.state.deployError,
        errorCount: 1,
      });
    } else {
      deployStatus = "idle";
    }

    // Get deploy status
    let canDeploy, canQueueDeploy, deployQueued;
    if (this.state.needsReDeploy) {
      if (this.state.userWillReDeploy) {
        deployQueued = true;
      } else {
        canDeploy = !this.state.deployPromise;
        canQueueDeploy = !!this.state.deployPromise;
      }
    }

    return {
      buildStatus,
      buildErrors,
      deployStatus,
      deployErrors,
      canDeploy,
      canQueueDeploy,
      deployQueued,
    };
  }
  getWatchedFiles() {
    return this.state.inputFiles;
  }

  handleFileChange(file) {
    if (!this.state.inputFiles.includes(file)) {
      return;
    }

    logger.info(chalk.grey("Rebuilding infrastructure..."));

    this.state.needsReBuild = true;

    // stop existing linter & type checker
    const { lintProcess, typeCheckProcess, synthPromise } = this.state;
    this.state.needsReCheck = false;
    this.state.lintProcess = null;
    this.state.typeCheckProcess = null;
    this.state.synthPromise = null;
    this.state.lintHasError = null;
    this.state.lintOutput = null;
    this.state.typeCheckErrorOutput = null;
    this.state.synthError = null;
    this.state.synthedChecksumData = null;
    lintProcess && lintProcess.kill();
    typeCheckProcess && typeCheckProcess.kill();
    synthPromise && synthPromise.cancel();

    // unset queued deploy
    this.state.needsReDeploy = false;
    this.state.userWillReDeploy = false;

    this.updateState();
  }
  handleDeploy() {
    const { needsReDeploy, deployPromise } = this.state;

    // Check can be deployed
    if (!needsReDeploy) {
      return;
    }

    // Check already will be deployed
    if (this.state.userWillReDeploy) {
      return;
    }

    // Deployment in progress => queue
    if (deployPromise) {
      logger.info(chalk.grey("Deployment is queued..."));
    }

    this.state.userWillReDeploy = true;

    this.updateState();
  }

  handleReBuildSucceeded({ inputFiles }) {
    logger.debug("handleReBuildSucceeded");

    // Note: If the handler included new files, while re-transpiling, the new files
    //       might have been updated. And because the new files has not been added to
    //       the watcher yet, handleFileChange() wouldn't get called. We need to re-transpile
    //       again.
    const oldInputFiles = this.state.inputFiles;
    const inputFilesDiff = array.diff(oldInputFiles, inputFiles);
    const hasNewInputFiles = inputFilesDiff.add.length > 0;
    const needsReBuild = this.state.needsReBuild || hasNewInputFiles;

    // Update entryPointsData
    this.state = {
      ...this.state,
      inputFiles,
      buildPromise: null,
      buildErrors: null,
      needsReBuild: needsReBuild,
      needsReCheck: !needsReBuild,
    };

    // Update watcher
    this.onAddWatchedFiles(inputFilesDiff.add);
    this.onRemoveWatchedFiles(inputFilesDiff.remove);

    // Update state
    this.updateState();
  }
  handleReBuildFailed({ errors }) {
    logger.debug("handleReBuildFailed", errors);

    // Update entryPointsData
    this.state = { ...this.state, buildPromise: null, buildErrors: errors };

    // Handle state BUSY => NOT BUSY
    if (!this.state.needsReBuild) {
      logger.info("Rebuilding infrastructure failed");
    }

    // Update state
    this.updateState();
  }

  handleLintDone({ cp, code, output }) {
    // Handle cancelled
    if (cp !== this.state.lintProcess) {
      logger.debug(`handleLintDone: linter cancelled`);
      return;
    }

    // Handle NOT cancelled
    logger.debug(`handleLintDone: linter exited with code ${code}`);

    this.state.lintProcess = null;
    this.state.lintHasError = code !== 0 ? true : null;
    this.state.lintOutput = output;

    this.handleCheckAndSynthDone();
  }
  handleTypeCheckDone({ cp, code, output }) {
    // Handle cancelled
    if (cp !== this.state.typeCheckProcess) {
      logger.debug(`handleTypeCheckDone: checker cancelled`);
      return;
    }

    // Handle NOT cancelled
    logger.debug(`handleTypeCheckDone: checker exited with code ${code}`);

    this.state.typeCheckProcess = null;
    this.state.typeCheckErrorOutput = code !== 0 ? output : null;

    this.handleCheckAndSynthDone();
  }
  handleSynthDone({ error, checksumData, isCancelled }) {
    // Handle cancelled
    if (error && isCancelled) {
      logger.debug(`handleSynthDone: synth cancelled`);
      return;
    }

    // Handle NOT cancelled
    logger.debug(`handleSynthDone: synth exited with error ${error}`);

    // Cdk synth error object has the "stderr" containing the error output.
    this.state.synthPromise = null;
    this.state.synthedChecksumData = error ? null : checksumData;
    this.state.synthError = error ? error.stderr : null;

    // TODO
    console.log({
      synthedChecksumData: this.state.synthedChecksumData,
      synthError: this.state.synthError,
    });

    this.handleCheckAndSynthDone();
  }

  handleReDeployDone({ error }) {
    error
      ? logger.info("Redeploying infrastructure failed")
      : logger.info(chalk.grey("Done deploying infrastructure"));

    this.state.deployPromise = null;
    this.state.deployError = error ? error : null;

    // Case 1: Handle has new changes
    if (this.state.needsReDeploy && !this.state.userWillReDeploy) {
      logger.info(
        chalk.cyan(
          "There are new infrastructure changes. Press ENTER to redeploy."
        )
      );
    }
    // Case 2: Handle no new changes, but deploy was failed, allow retry
    else if (error) {
      this.state.needsReDeploy = true;
      logger.info(chalk.cyan("Press ENTER to redeploy infrastructure again"));
    }

    // Update state
    this.updateState();
  }

  ///////////////////////
  // Private Functions //
  ///////////////////////

  updateState() {
    logger.trace(this.serializeState());
    this.updateStateProcess();
    this.onStatusUpdated(this.getStatus());
  }
  updateStateProcess() {
    // If building, don't do anything. Because esbuild is quick and we don't
    // have to stop it. Once esbuild is done, updateState() will be called again.
    if (this.state.buildPromise) {
      return;
    }

    // Build
    if (this.state.needsReBuild) {
      this.state.needsReBuild = false;
      this.state.buildPromise = this.onReBuild();
      this.state.buildErrors = null;
      return;
    }

    // Build running => wait
    // Build failed => do not run lint and checker
    if (this.state.buildPromise || this.state.buildErrors) {
      return;
    }

    // Check & Synth
    // - lintProcess can be null if lint is disabled
    // - typeCheck can be null if type check is disabled, or there is no typescript files
    if (this.state.needsReCheck) {
      this.state.needsReCheck = false;
      this.state.lintProcess = this.onLint(this.state.inputFiles);
      this.state.typeCheckProcess = this.onTypeCheck(this.state.inputFiles);
      this.state.synthPromise = this.onSynth();
      this.state.lintHasError = null;
      this.state.lintOutput = null;
      this.state.typeCheckErrorOutput = null;
      this.state.synthError = null;
      this.state.synthedChecksumData = null;
      return;
    }

    // Check & Synth running => wait
    if (
      this.state.lintProcess ||
      this.state.typeCheckProcess ||
      this.state.synthPromise
    ) {
      return;
    }

    // Check & Synth fail => do not run deploy
    if (
      this.state.lintHasError ||
      this.state.typeCheckErrorOutput ||
      this.state.synthError
    ) {
      return;
    }

    // Deploying => wait
    if (this.state.deployPromise) {
      return;
    }

    // Deploy
    if (this.state.needsReDeploy && this.state.userWillReDeploy) {
      this.state.needsReDeploy = false;
      this.state.userWillReDeploy = false;
      this.state.lastDeployingChecksumData = this.state.synthedChecksumData;
      this.state.deployPromise = this.onReDeploy({
        checksumData: this.state.lastDeployingChecksumData,
      });
      this.state.deployError = null;
      return;
    }
  }
  serializeState() {
    return JSON.stringify({
      ...this.state,
      buildPromise: this.state.buildPromise && "<Promise>",
      lintProcess: this.state.lintProcess && "<ChildProcess>",
      typeCheckProcess: this.state.typeCheckProcess && "<ChildProcess>",
      synthPromise: this.state.synthPromise && "<Promise>",
      deployPromise: this.state.deployPromise && "<Promise>",
    });
  }
  checkCacheChanged(oldChecksumData, newChecksumData) {
    return Object.keys(newChecksumData).some(
      (name) => newChecksumData[name] !== oldChecksumData[name]
    );
  }

  handleCheckAndSynthDone() {
    // Not all have finished
    if (
      this.state.lintProcess ||
      this.state.typeCheckProcess ||
      this.state.synthPromise
    ) {
      return;
    }

    // Handle state BUSY => NOT BUSY
    const hasError =
      this.state.lintHasError ||
      this.state.typeCheckErrorOutput ||
      this.state.synthError;
    if (!this.state.needsReBuild) {
      if (hasError) {
        logger.info("Rebuilding infrastructure failed");
        this.state.needsReDeploy = false;
      } else {
        // calculate manifest checksum and see if there are changes
        const isCacheChanged = this.checkCacheChanged(
          this.state.lastDeployingChecksumData,
          this.state.synthedChecksumData
        );
        if (isCacheChanged) {
          this.state.deployPromise
            ? logger.info(
                chalk.cyan(
                  "Deployment in progress. Press ENTER to deploy the new changes after."
                )
              )
            : logger.info(chalk.cyan("Press ENTER to redeploy infrastructure"));
          this.state.needsReDeploy = true;
        } else {
          logger.info(chalk.grey("No infrastructure changes detected"));
          this.state.needsReDeploy = false;
        }
      }
    }

    // Update state
    this.updateState();
  }
};
