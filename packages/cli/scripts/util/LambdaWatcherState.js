"use strict";

const os = require("os");
const chalk = require("chalk");
const allSettled = require("promise.allsettled");

// Setup logger
const { getChildLogger } = require("@serverless-stack/core");
const logger = getChildLogger("lambda-watcher-state");

// Create Promise.allSettled shim (required for NodeJS 10)
allSettled.shim();

const {
  isGoRuntime,
  isNodeRuntime,
  isPythonRuntime,
} = require("./cdkHelpers");
const array = require("../../lib/array");

const BUILDER_CONCURRENCY = os.cpus().length;
const REBUILD_PRIORITY = {
  OFF: 0,   // entry point does not need to rebuild
  LOW: 1,   // entry point needs to rebuild because file changed
  HIGH: 2,  // entry point needs to rebuild because a request is waiting
};
const entryPointDataTemplateObject = {
  srcPath: null,
  handler: null,
  runtime: null,
  bundle: null,
  hasError: false,
  buildPromise: null,
  outEntryPoint: null,
  needsReBuild: REBUILD_PRIORITY.OFF,
  pendingRequestCallbacks: [],
  // NodeJS
  tsconfig: null,
  esbuilder: null,
  inputFiles: [],
};
const srcPathDataTemplateObject = {
  srcPath: null,
  tsconfig: null,
  inputFiles: [],
  lintProcess: null,
  needsReCheck: false,
  typeCheckProcess: null,
};

module.exports = class LambdaWatcherState {

  constructor(config) {
    this.hasGoRuntime = false;
    this.hasNodeRuntime = false;
    config.lambdaHandlers.forEach(({ runtime }) => {
      this.hasGoRuntime = this.hasGoRuntime || isGoRuntime(runtime);
      this.hasNodeRuntime = this.hasNodeRuntime || isNodeRuntime(runtime);
    });

    this.onTranspileNode = config.onTranspileNode;
    this.onReTranspileNode = config.onReTranspileNode;
    this.onRunLint = config.onRunLint;
    this.onRunTypeCheck = config.onRunTypeCheck;
    this.onCompileGo = config.onCompileGo;
    this.onReCompileGo = config.onReCompileGo;
    this.onBuildPython = config.onBuildPython;
    this.onUpdateWatchedFiles = config.onUpdateWatchedFiles;

    this.state = {
      isProcessingLambdaChanges: false,
      entryPointsData: {}, // KEY: $srcPath/$entry/$handler
      srcPathsData: {}, // KEY: $srcPath
      watchedNodeFilesIndex: {},// KEY: /path/to/lambda.js          VALUE: [ entryPoint ]
    };

    // Initialize 'entryPointsData' state
    config.lambdaHandlers.forEach(({ srcPath, handler, runtime, bundle }) => {
      const key = this.buildEntryPointKey(srcPath, handler);
      this.state.entryPointsData[key] = {
        ...entryPointDataTemplateObject,
        srcPath,
        handler,
        runtime,
        bundle,
        // need to set pendingRequestCallbacks to [] otherwise all handlers' pendingRequestCallbacks
        // are going to point to the same [] in entryPointDataTemplateObject
        pendingRequestCallbacks: [],
      };
    });
  }

  //////////////////////
  // Public Functions //
  //////////////////////

  async runInitialBuild(isTest) {
    // Run transpiler
    logger.info(chalk.grey("Transpiling Lambda code..."));

    const results = await Promise.allSettled(
      Object.values(this.state.entryPointsData).map(({ srcPath, handler, runtime, bundle }) => {
        // Do not catch build errors, let the start process fail
        if (isGoRuntime(runtime)) {
          return this.onCompileGo(srcPath, handler);
        }
        else if (isPythonRuntime(runtime)) {
          return this.onBuildPython(srcPath, handler);
        }
        else if (isNodeRuntime(runtime)) {
          return this.onTranspileNode(srcPath, handler, bundle);
        }
      })
    );

    const hasError = results.some((result) => result.status === "rejected");
    if (hasError) {
      throw new Error("Failed to build the Lambda handlers");
    }

    // Running inside test => do not run lint and type check
    if (isTest) {
      return;
    }

    // Validate transpiled
    const srcPaths = Object.keys(this.state.srcPathsData);
    if (srcPaths.length === 0) {
      throw new Error("No Lambda handlers are found in the app");
    }

    // Run Node lint and type check
    srcPaths.forEach(srcPath => {
      const { inputFiles, tsconfig } = this.state.srcPathsData[srcPath];
      this.handleLintAndTypeCheckStarted({
        srcPath,
        lintProcess: this.onRunLint(srcPath, inputFiles),
        typeCheckProcess: this.onRunTypeCheck(srcPath, inputFiles, tsconfig),
      });
    });
  }

  getState() {
    return this.state;
  }

  async getTranspiledHandler(srcPath, handler) {
    // Get entry point data
    const key = this.buildEntryPointKey(srcPath, handler);
    const entryPointData = this.state.entryPointsData[key];

    // Handle entry point is building or pending building
    if (entryPointData.buildPromise || entryPointData.needsReBuild) {
      // set priority to high to get build first
      entryPointData.needsReBuild = REBUILD_PRIORITY.HIGH;
      logger.debug(`Waiting for re-transpiler output for ${handler}...`);
      await new Promise((resolve, reject) =>
        entryPointData.pendingRequestCallbacks.push({ resolve, reject })
      );
      logger.debug(`Waited for re-transpiler output for ${handler}`);
    }

    return {
      runtime: entryPointData.runtime,
      handler: entryPointData.outEntryPoint,
    };
  }

  getWatchedFiles() {
    const files = [];
    if (this.hasNodeRuntime) {
      files.push(...Object.keys(this.state.watchedNodeFilesIndex));
    }
    if (this.hasGoRuntime) {
      files.push("**/*.go");
    }
    return files;
  }

  handleFileChange(file) {
    logger.debug(`handleFileChange: ${file}`);

    // Handle Lambda code changed
    let entryPointKeys;
    // Go file changed => rebuild all Go entrypoints
    if (file.endsWith(".go")) {
      entryPointKeys = Object.keys(this.state.entryPointsData).filter(key =>
        isGoRuntime(this.state.entryPointsData[key].runtime)
      );
    }
    // NodeJS file changed => rebuild affected NodeJS entrypoints
    else {
      entryPointKeys = this.state.watchedNodeFilesIndex[file];
    }

    // Validate no entrypoints affected
    if (!entryPointKeys) {
      logger.debug("onFileChanged: File is not linked to the entry points");
      return;
    }

    // Mark changed entrypoints needs to rebuild
    entryPointKeys.map((key) => {
      this.state.entryPointsData[key].needsReBuild = REBUILD_PRIORITY.LOW;
    });

    // Update state
    this.updateState();
  }

  handleBuildSucceeded(
    srcPath,
    handler,
    { tsconfig, esbuilder, outEntryPoint, inputFiles }
  ) {
    const key = this.buildEntryPointKey(srcPath, handler);
    // Update entryPointsData
    this.state.entryPointsData[key] = {
      ...this.state.entryPointsData[key],
      tsconfig,
      esbuilder,
      inputFiles,
      outEntryPoint,
    };

    if (isNodeRuntime(this.state.entryPointsData[key].runtime)) {
      // Update srcPath index
      this.state.srcPathsData[srcPath] = {
        ...srcPathDataTemplateObject,
        srcPath,
        tsconfig,
        inputFiles: this.getSrcPathInputFiles(srcPath),
      };

      // Update inputFiles
      inputFiles.forEach((file) => {
        this.state.watchedNodeFilesIndex[file] =
          this.state.watchedNodeFilesIndex[file] || [];
        this.state.watchedNodeFilesIndex[file].push(key);
      });
    }
  }
  handleReBuildStarted({ srcPath, handler, buildPromise }) {
    const key = this.buildEntryPointKey(srcPath, handler);

    // Update entryPointsData
    this.state.entryPointsData[key] = {
      ...this.state.entryPointsData[key],
      needsReBuild: REBUILD_PRIORITY.OFF,
      buildPromise,
    };
  }
  async handleReBuildSucceeded(srcPath, handler, { inputFiles }) {
    const key = this.buildEntryPointKey(srcPath, handler);

    // Note: If the handler included new files, while re-transpiling, the new files
    //       might have been updated. And because the new files has not been added to
    //       the watcher yet, handleFileChange() wouldn't get called. We need to re-transpile
    //       again.
    const oldInputFiles = this.state.entryPointsData[key].inputFiles;
    const inputFilesDiff = array.diff(oldInputFiles, inputFiles);
    const hasNewInputFiles = inputFilesDiff.add.length > 0;
    let needsReBuild = this.state.entryPointsData[key].needsReBuild;
    if (!needsReBuild && hasNewInputFiles) {
      needsReBuild = REBUILD_PRIORITY.LOW;
    }

    // Update entryPointsData
    this.state.entryPointsData[key] = {
      ...this.state.entryPointsData[key],
      inputFiles,
      hasError: false,
      buildPromise: null,
      needsReBuild,
    };

    // Handle Node runtime => Run lint and type check
    if (isNodeRuntime(this.state.entryPointsData[key].runtime)) {
      // Update srcPathsData
      this.state.srcPathsData[srcPath] = {
        ...this.state.srcPathsData[srcPath],
        inputFiles: this.getSrcPathInputFiles(srcPath),
        needsReCheck: true,
      };

      // Update watched files index
      inputFilesDiff.add.forEach((file) => {
        this.state.watchedNodeFilesIndex[file] =
          this.state.watchedNodeFilesIndex[file] || [];
        this.state.watchedNodeFilesIndex[file].push(key);
      });
      inputFilesDiff.remove.forEach((file) => {
        const index = this.state.watchedNodeFilesIndex[file].indexOf(key);
        if (index > -1) {
          this.state.watchedNodeFilesIndex[file].splice(index, 1);
        }
        if (this.state.watchedNodeFilesIndex[file] === 0) {
          delete this.state.watchedNodeFilesIndex[file];
        }
      });

      // Update watcher
      this.onUpdateWatchedFiles(inputFilesDiff.add, inputFilesDiff.remove);
    }

    // Update state
    this.updateState();

    // Fullfil pending requests
    if (!this.state.entryPointsData[key].needsReBuild) {
      this.state.entryPointsData[key].pendingRequestCallbacks.forEach(
        ({ resolve }) => {
          resolve();
        }
      );
    }
  }
  handleReBuildFailed(srcPath, handler) {
    const key = this.buildEntryPointKey(srcPath, handler);

    // Update entryPointsData
    this.state.entryPointsData[key] = {
      ...this.state.entryPointsData[key],
      hasError: true,
      buildPromise: null,
    };

    // Update state
    this.updateState();

    // Fullfil pending requests
    if (!this.state.entryPointsData[key].needsReBuild) {
      this.state.entryPointsData[key].pendingRequestCallbacks.forEach(
        ({ reject }) => {
          reject(`Failed to transpile srcPath ${srcPath} handler ${handler}`);
        }
      );
    }
  }

  handleLintAndTypeCheckStarted({
    srcPath,
    lintProcess,
    typeCheckProcess,
  }) {
    // Note:
    // - lintProcess can be null if lint is disabled
    // - typeCheck can be null if type check is disabled, or there is no typescript files

    // Update srcPath index
    this.state.srcPathsData[srcPath] = {
      ...this.state.srcPathsData[srcPath],
      lintProcess,
      typeCheckProcess,
      needsReCheck: false,
    };

    // Update state
    this.updateState();
  }
  handleLintDone(srcPath) {
    this.state.srcPathsData[srcPath] = {
      ...this.state.srcPathsData[srcPath],
      lintProcess: null,
    };

    // Update state
    this.updateState();
  }
  handleTypeCheckDone(srcPath) {
    this.state.srcPathsData[srcPath] = {
      ...this.state.srcPathsData[srcPath],
      typeCheckProcess: null,
    };

    // Update state
    this.updateState();
  }

  ///////////////////////
  // Private Functions //
  ///////////////////////

  buildEntryPointKey(srcPath, handler) {
    return `${srcPath}/${handler}`;
  }
  getSrcPathInputFiles(srcPath) {
    const srcPathInputFiles = Object.values(this.state.entryPointsData)
      .filter(({ srcPath: entryPointSrcPath }) => entryPointSrcPath === srcPath)
      .map(({ inputFiles }) => inputFiles)
      .flat();
    return array.unique(srcPathInputFiles);
  }

  updateState() {
    logger.trace(this.serializeState());

    const { entryPointsData, srcPathsData } = this.state;

    // Print state busy status
    this.updateBusyStatus()

    // Gather build data
    const goEPsBuilding = [];
    const goEPsNeedsRebuild = [];
    const nodeEPsNeedsRebuild = [];
    Object.keys(entryPointsData).forEach((key) => {
      let {
        runtime,
        buildPromise,
        needsReBuild,
      } = entryPointsData[key];
      // handle Go runtime: construct goEPsNeedsRebuild array with HIGH priority first
      if (isGoRuntime(runtime)) {
        if (buildPromise) {
          goEPsBuilding.push(entryPointsData[key]);
        }
        else if (needsReBuild === REBUILD_PRIORITY.LOW) {
          // add to the end
          goEPsNeedsRebuild.push(entryPointsData[key]);
        }
        else if (needsReBuild === REBUILD_PRIORITY.HIGH) {
          // add to the beginning
          goEPsNeedsRebuild.unshift(entryPointsData[key]);
        }
      }
      // handle Node runtime
      if (isNodeRuntime(runtime)) {
        if (!buildPromise && needsReBuild) {
          nodeEPsNeedsRebuild.push(entryPointsData[key]);
        }
      }
    });

    // Build all Node entry points
    nodeEPsNeedsRebuild.forEach(({ srcPath, handler }) => {
      const key = this.buildEntryPointKey(srcPath, handler);
      const { esbuilder } = this.state.entryPointsData[key];
      const buildPromise = this.onReTranspileNode(srcPath, handler, esbuilder);
      this.handleReBuildStarted({ srcPath, handler, buildPromise });
    });

    // Build Go entry points if concurrency is not saturated
    const concurrencyUsed = goEPsBuilding.length;
    const concurrencyRemaining = BUILDER_CONCURRENCY - concurrencyUsed;
    goEPsNeedsRebuild
      .slice(0, concurrencyRemaining)
      .forEach(({ srcPath, handler }) => {
        const buildPromise = this.onReCompileGo(srcPath, handler);
        this.handleReBuildStarted({ srcPath, handler, buildPromise });
      });

    // Check all entrypoints transpiled, if not => wait
    const isTranspiling = Object.values(entryPointsData).some(({ buildPromise }) => buildPromise);
    if (isTranspiling) {
      return;
    }

    // Check all entrypoints successfully transpiled, if not => do not run lint and checker
    const hasError = Object.values(entryPointsData).some(({ hasError }) => hasError);
    if (hasError) {
      return;
    }

    // Run linter and type checker
    Object.keys(srcPathsData).forEach(srcPath => {
      let { lintProcess, typeCheckProcess, needsReCheck, inputFiles, tsconfig } = srcPathsData[
        srcPath
      ];
      if (needsReCheck) {
        // stop existing linter & type checker
        lintProcess && lintProcess.kill();
        typeCheckProcess && typeCheckProcess.kill();

        // start new linter & type checker
        lintProcess = this.onRunLint(srcPath, inputFiles);
        typeCheckProcess = this.onRunTypeCheck(srcPath, inputFiles, tsconfig);

        this.handleLintAndTypeCheckStarted({
          srcPath,
          lintProcess,
          typeCheckProcess,
        });
      }
    });
  }
  updateBusyStatus() {
    const { entryPointsData, srcPathsData } = this.state;

    // Check status change NOT BUSY => BUSY
    if (!this.state.isProcessingLambdaChanges) {
      // some entry points needs to re-build => BUSY
      const needsReBuild = Object.values(entryPointsData).some(({ needsReBuild }) => needsReBuild);
      if (!needsReBuild) {
        return;
      }

      this.state.isProcessingLambdaChanges = true;
      logger.info(chalk.grey("Rebuilding code..."));
    }

    // Check status change BUSY => NOT BUSY
    else {
      // some entry points are building or needs to re-build => BUSY
      const isBuilding = Object.values(entryPointsData).some(({ needsReBuild, buildPromise }) => needsReBuild || buildPromise);
      if (isBuilding) {
        return;
      }

      // some entry points failed to build => NOT BUSY (b/c not going to lint and type check)
      const hasError = Object.values(entryPointsData).some(({ hasError }) => hasError);
      if (hasError) {
        this.state.isProcessingLambdaChanges = false;
        logger.info("Rebuilding code failed");
        return;
      }

      // some srcPaths are linting, type-checking, or need to re-check => BUSY
      const isChecking = Object.values(srcPathsData).some(({ needsReCheck, lintProcess, typeCheckProcess }) => needsReCheck || lintProcess || typeCheckProcess);
      if (isChecking) {
        return;
      }

      this.state.isProcessingLambdaChanges = false;
      logger.info(chalk.grey("Done building code"));
    }
  }
  serializeState() {
    const {
      isProcessingLambdaChanges,
      entryPointsData,
      srcPathsData,
      watchedNodeFilesIndex,
    } = this.state;
    return JSON.stringify({
      isProcessingLambdaChanges,
      entryPointsData: Object.keys(entryPointsData).reduce(
        (acc, key) => ({
          ...acc,
          [key]: {
            hasError: entryPointsData[key].hasError,
            inputFiles: entryPointsData[key].inputFiles,
            buildPromise:
              entryPointsData[key].buildPromise && "<Promise>",
            needsReBuild: entryPointsData[key].needsReBuild,
            pendingRequestCallbacks: `<Count ${entryPointsData[key].pendingRequestCallbacks.length}>`,
          },
        }),
        {}
      ),
      srcPathsData: Object.keys(srcPathsData).reduce(
        (acc, key) => ({
          ...acc,
          [key]: {
            inputFiles: srcPathsData[key].inputFiles,
            lintProcess: srcPathsData[key].lintProcess && "<ChildProcess>",
            typeCheckProcess:
              srcPathsData[key].typeCheckProcess && "<ChildProcess>",
            needsReCheck: srcPathsData[key].needsReCheck,
          },
        }),
        {}
      ),
      watchedNodeFilesIndex,
    });
  }
}
