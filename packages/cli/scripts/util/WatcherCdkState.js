"use strict";

const chalk = require("chalk");

// Setup logger
const { getChildLogger } = require("@serverless-stack/core");
const logger = getChildLogger("watcher-cdk-state");

const array = require("../../lib/array");

module.exports = class WatcherCdkState {

  constructor(config) {
    this.state = {
      inputFiles: [ ...config.inputFiles ],
      // build
      buildPromise: null,
      needsReBuild: false,
      hasBuildError: false,
      // checks & synth
      needsReCheck: false,
      lintProcess: null,
      typeCheckProcess: null,
      synthPromise: null,
      hasLintError: false,
      hasTypeCheckError: false,
      hasSynthError: false,
      // deploy
      needsReDeploy: false,
      userWillReDeploy: false,
      deployPromise: null,
    };

    this.runReBuild = config.runReBuild;
    this.runLint = config.runLint;
    this.runTypeCheck = config.runTypeCheck;
    this.runSynth = config.runSynth;
    this.runReDeploy = config.runReDeploy;
    this.updateWatchedFiles = config.updateWatchedFiles;
  }

  //////////////////////
  // Public Functions //
  //////////////////////

  getInputFiles(){
    return this.state.inputFiles;
  }

  onFileChange(file) {
    if (!this.state.inputFiles.includes(file)) { return; }

    logger.info(chalk.grey("Rebuilding infrastructure..."));

    this.state.needsReBuild = true;

    // stop existing linter & type checker
    const { lintProcess, typeCheckProcess, synthPromise } = this.state;
    this.state.needsReCheck = false;
    this.state.lintProcess = null;
    this.state.typeCheckProcess = null;
    this.state.synthPromise = null;
    lintProcess && lintProcess.kill();
    typeCheckProcess && typeCheckProcess.kill();
    synthPromise && synthPromise.cancel();

    // unset queued deploy
    this.state.needsReDeploy = false;
    this.state.userWillReDeploy = false;

    this.updateState();
  }
  onInput() {
    const { needsReDeploy, deployPromise } = this.state;

    // Check can be deployed
    if (!needsReDeploy) { return; }

    // Check already will be deployed
    if (this.state.userWillReDeploy) { return; }

    // Deployment in progress => queue
    if (deployPromise) {
      logger.info(chalk.grey("Deployment is queued..."));
    }

    this.state.userWillReDeploy = true;

    this.updateState();
  }

  onCdkReBuildSucceeded({ inputFiles }) {
    logger.debug("onCdkReBuildSucceeded");

    // Note: If the handler included new files, while re-transpiling, the new files
    //       might have been updated. And because the new files has not been added to
    //       the watcher yet, onFileChange() wouldn't get called. We need to re-transpile
    //       again.
    const oldInputFiles = this.state.inputFiles;
    const inputFilesDiff = array.diff(oldInputFiles, inputFiles);
    const hasNewInputFiles = inputFilesDiff.add.length > 0;
    const needsReBuild = this.state.needsReBuild || hasNewInputFiles;

    // Update entryPointsData
    this.state = { ...this.state,
      inputFiles,
      buildPromise: null,
      hasBuildError: false,
      needsReBuild: needsReBuild,
      needsReCheck: !needsReBuild,
    };

    // Update watcher
    this.updateWatchedFiles(inputFilesDiff.add, inputFilesDiff.remove);

    // Update state
    this.updateState();
  }
  onCdkReBuildFailed(e) {
    logger.debug("onCdkReBuildFailed", e);

    // Update entryPointsData
    this.state = { ...this.state,
      buildPromise: null,
      hasBuildError: true,
    };

    // Handle state BUSY => NOT BUSY
    if (!this.state.needsReBuild) {
      logger.info("Rebuilding infrastructure failed");
    }

    // Update state
    this.updateState();
  }

  onCdkLintDone({ cp, code }) {
    // Handle cancelled
    if (cp !== this.state.lintProcess) {
      logger.debug(`onCdkLintDone: linter cancelled`);
      return;
    }

    // Handle NOT cancelled
    logger.debug(`onCdkLintDone: linter exited with code ${code}`);

    this.state.lintProcess = null;
    this.state.hasLintError = code !== 0;

    this.onCdkCheckAndSynthDone();
  }
  onCdkTypeCheckDone({ cp, code }) {
    // Handle cancelled
    if (cp !== this.state.typeCheckProcess) {
      logger.debug(`onCdkTypeCheckDone: checker cancelled`);
      return;
    }

    // Handle NOT cancelled
    logger.debug(`onCdkTypeCheckDone: checker exited with code ${code}`);

    this.state.typeCheckProcess = null;
    this.state.hasTypeCheckError = code !== 0;

    this.onCdkCheckAndSynthDone();
  }
  onCdkSynthDone({ hasError, isCancelled }) {
    // Handle cancelled
    if (hasError && isCancelled) {
      logger.debug(`onCdkSynthDone: synth cancelled`);
      return;
    }

    // Handle NOT cancelled
    logger.debug(`onCdkSynthDone: synth exited with hasError ${hasError}`);

    this.state.synthPromise = null;
    this.state.hasSynthError = hasError;

    this.onCdkCheckAndSynthDone();
  }
  onCdkCheckAndSynthDone() {
    // Not all have finished
    if (this.state.lintProcess
      || this.state.typeCheckProcess
      || this.state.synthPromise) {
      return;
    }

    // Handle state BUSY => NOT BUSY
    const hasError = this.state.hasLintError
      || this.state.hasTypeCheckError
      || this.state.hasSynthError;
    if (!this.state.needsReBuild) {
      if (hasError) {
        logger.info("Rebuilding infrastructure failed");
      }
      else {
        this.state.deployPromise
          ? logger.info(chalk.cyan("Deployment in progress. Press ENTER to deploy the new changes after."))
          : logger.info(chalk.cyan("Press ENTER to redeploy infrastructure"));
      }
    }

    // Update state
    this.state.needsReDeploy = !hasError;
    this.updateState();
  }

  onCdkReDeployDone({ hasError }) {
    hasError
      ? logger.info("Redeploying infrastructure failed")
      : logger.info(chalk.grey("Done deploying infrastructure"));

    this.state.deployPromise = null;

    // Handle has new changes
    if (this.state.needsReDeploy && !this.state.userWillReDeploy) {
      logger.info(chalk.cyan("There are new infrastructure changes. Press ENTER to redeploy."));
    }

    // Update state
    this.updateState();
  }

  ///////////////////////
  // Private Functions //
  ///////////////////////

  updateState() {
    logger.trace(this.serializeState());

    // If building, don't do anything. Because esbuild is quick and we don't
    // have to stop it. Once esbuild is done, updateState() will be called again.
    if (this.state.buildPromise) { return; }

    // Build
    if (this.state.needsReBuild) {
      this.state.needsReBuild = false;
      this.state.buildPromise = this.runReBuild();
      this.state.hasBuildError = false;
      return;
    }

    // Build running => wait
    // Build failed => do not run lint and checker
    if (this.state.buildPromise || this.state.hasBuildError) { return; }

    // Check & Synth
    // - lintProcess can be null if lint is disabled
    // - typeCheck can be null if type check is disabled, or there is no typescript files
    if (this.state.needsReCheck) {
      this.state.needsReCheck = false;
      this.state.lintProcess = this.runLint(this.state.inputFiles);
      this.state.typeCheckProcess = this.runTypeCheck(this.state.inputFiles);
      this.state.synthPromise = this.runSynth();
      this.state.hasLintError = false;
      this.state.hasTypeCheckError = false;
      this.state.hasSynthError = false;
      return;
    }

    // Check & Synth running => wait
    if (this.state.lintProcess
      || this.state.typeCheckProcess
      || this.state.synthPromise) {
      return;
    }

    // Check & Synth fail => do not run deploy
    if (this.state.hasLintError
      || this.state.hasTypeCheckError
      || this.state.hasSynthError) { return; }

    // Deploying => wait
    if (this.state.deployPromise) { return; }

    // Deploy
    if (this.state.needsReDeploy && this.state.userWillReDeploy) {
      this.state.needsReDeploy = false;
      this.state.userWillReDeploy = false;
      this.state.deployPromise = this.runReDeploy();
      return;
    }
  }
  serializeState(){
    return JSON.stringify({
      ...this.state,
      buildPromise: this.state.buildPromise && "<Promise>",
      lintProcess: this.state.lintProcess && "<ChildProcess>",
      typeCheckProcess: this.state.typeCheckProcess && "<ChildProcess>",
      synthPromise: this.state.synthPromise && "<Promise>",
      deployPromise: this.state.deployPromise && "<Promise>",
    });
  }
}
