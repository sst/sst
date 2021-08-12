"use strict";

const os = require("os");
const path = require("path");
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
  isDotnetRuntime,
  isPythonRuntime,
} = require("./cdkHelpers");
const array = require("../../lib/array");

const BUILDER_CONCURRENCY = os.cpus().length;
const REBUILD_PRIORITY = {
  OFF: 0, // entry point does not need to rebuild
  LOW: 1, // entry point needs to rebuild because file changed
  HIGH: 2, // entry point needs to rebuild because a request is waiting
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
    this.hasDotnetRuntime = false;
    config.lambdaHandlers.forEach(({ runtime }) => {
      this.hasGoRuntime = this.hasGoRuntime || isGoRuntime(runtime);
      this.hasNodeRuntime = this.hasNodeRuntime || isNodeRuntime(runtime);
      this.hasDotnetRuntime = this.hasDotnetRuntime || isDotnetRuntime(runtime);
    });

    this.onTranspileNode = config.onTranspileNode;
    this.onRunLint = config.onRunLint;
    this.onRunTypeCheck = config.onRunTypeCheck;
    this.onCompileGo = config.onCompileGo;
    this.onBuildDotnet = config.onBuildDotnet;
    this.onBuildPython = config.onBuildPython;
    this.onAddWatchedFiles = config.onAddWatchedFiles;
    this.onRemoveWatchedFiles = config.onRemoveWatchedFiles;

    this.state = {
      isProcessingLambdaChanges: false,
      entryPointsData: {}, // KEY: $srcPath/$entry/$handler
      srcPathsData: {}, // KEY: $srcPath
      watchedNodeFilesIndex: {}, // KEY: /path/to/lambda.js          VALUE: [ entryPoint ]
    };

    // Initialize 'entryPointsData' state
    config.lambdaHandlers.forEach((lambdaHandler) =>
      this.initializeEntryPoint(lambdaHandler)
    );
  }

  //////////////////////
  // Public Functions //
  //////////////////////

  async runInitialBuild(isTest) {
    // Run transpiler
    logger.info(chalk.grey("Transpiling Lambda code..."));

    let hasError = false;
    const dotnetSrcPathsBuilt = [];
    await Promise.allSettled(
      Object.values(this.state.entryPointsData).map(
        ({ srcPath, handler, runtime, bundle }) => {
          // Do not catch build errors, let the start process fail
          const onSuccess = (data) =>
            this.handleBuildSucceeded(srcPath, handler, data);
          const onFailure = () => {
            hasError = true;
          };
          if (isGoRuntime(runtime)) {
            return this.onCompileGo({ srcPath, handler, onSuccess, onFailure });
          } else if (isDotnetRuntime(runtime)) {
            // Build .NET entry points
            // Note: only need to build each .NET srcPath once. All handlers
            //       in a srcPath are built into the same package.
            if (dotnetSrcPathsBuilt.includes(srcPath)) {
              return;
            }
            dotnetSrcPathsBuilt.push(srcPath);
            return this.onBuildDotnet({
              srcPath,
              handler,
              onSuccess,
              onFailure,
            });
          } else if (isPythonRuntime(runtime)) {
            return this.onBuildPython({
              srcPath,
              handler,
              onSuccess,
              onFailure,
            });
          } else if (isNodeRuntime(runtime)) {
            return this.onTranspileNode({
              srcPath,
              handler,
              bundle,
              onSuccess,
              onFailure,
            });
          }
        }
      )
    );

    if (hasError) {
      throw new Error("Failed to build the Lambda handlers");
    }

    // Running inside test => do not run lint and type check
    if (isTest) {
      return;
    }

    // Run Node lint and type check
    // - lintProcess can be null if lint is disabled
    // - typeCheck can be null if type check is disabled, or there is no typescript files
    const srcPaths = Object.keys(this.state.srcPathsData);
    srcPaths.forEach((srcPath) => {
      const { inputFiles, tsconfig } = this.state.srcPathsData[srcPath];
      this.state.srcPathsData[srcPath].needsReCheck = false;
      this.state.srcPathsData[srcPath].lintProcess = this.onRunLint(
        srcPath,
        inputFiles
      );
      this.state.srcPathsData[srcPath].typeCheckProcess = this.onRunTypeCheck(
        srcPath,
        inputFiles,
        tsconfig
      );
    });
  }

  getState() {
    return this.state;
  }
  getWatchedFiles() {
    const files = [];
    if (this.hasNodeRuntime) {
      files.push(...Object.keys(this.state.watchedNodeFilesIndex));
    }
    if (this.hasGoRuntime) {
      files.push("**/*.go");
    }
    if (this.hasDotnetRuntime) {
      files.push("**/*.cs", "**/*.csproj");
    }
    return files;
  }
  async getTranspiledHandler(srcPath, handler) {
    // Get entry point data
    const key = this.buildEntryPointKey(srcPath, handler);
    const {
      buildPromise,
      needsReBuild,
      outEntryPoint,
    } = this.state.entryPointsData[key];

    // Wait for entry point to build if:
    // - is building;
    // - needs to be rebuild;
    // - has not been successfully built
    if (buildPromise || needsReBuild || !outEntryPoint) {
      logger.debug(`Waiting for re-transpiler output for ${handler}...`);

      // set priority to high to get build first
      this.state.entryPointsData[key].needsReBuild = REBUILD_PRIORITY.HIGH;

      // create the callback promise for waiting to build
      const promise = new Promise((resolve, reject) =>
        this.state.entryPointsData[key].pendingRequestCallbacks.push({
          resolve,
          reject,
        })
      );

      // trigger build
      this.updateState();

      // wait for build to finish
      await promise;

      logger.debug(`Waited for re-transpiler output for ${handler}`);
    }

    return {
      runtime: this.state.entryPointsData[key].runtime,
      handler: this.state.entryPointsData[key].outEntryPoint,
    };
  }

  handleFileChange(file) {
    logger.debug(`handleFileChange: ${file}`);

    let entryPointKeys;
    // Go file changed => rebuild all Go entrypoints
    if (file.endsWith(".go")) {
      entryPointKeys = Object.keys(this.state.entryPointsData).filter((key) =>
        isGoRuntime(this.state.entryPointsData[key].runtime)
      );
    }
    // .NET file changed => rebuild all .NET entrypoints in the same srcPath
    else if (file.endsWith(".cs") || file.endsWith(".csproj")) {
      entryPointKeys = Object.keys(this.state.entryPointsData).filter((key) => {
        const entryPointData = this.state.entryPointsData[key];
        return (
          isDotnetRuntime(entryPointData.runtime) &&
          path.resolve(file).startsWith(path.resolve(entryPointData.srcPath))
        );
      });
    }
    // NodeJS file changed => rebuild affected NodeJS entrypoints
    else {
      entryPointKeys = this.state.watchedNodeFilesIndex[file] || [];
    }

    // Validate no entrypoints affected
    if (entryPointKeys.length === 0) {
      logger.debug("onFileChanged: File is not linked to the entry points");
      return;
    }

    // Mark changed entrypoints needs to rebuild
    entryPointKeys.forEach((key) => {
      this.state.entryPointsData[key].needsReBuild = REBUILD_PRIORITY.LOW;
    });

    // Update state
    this.updateState();
  }
  handleUpdateLambdaHandlers(lambdaHandlers) {
    logger.debug("handleUpdateLambdaHandlers", lambdaHandlers);

    // Update watched languages
    const hasGoRuntimeOld = this.hasGoRuntime;
    const hasDotnetRuntimeOld = this.hasDotnetRuntime;

    this.hasGoRuntime = false;
    this.hasNodeRuntime = false;
    this.hasDotnetRuntime = false;
    lambdaHandlers.forEach(({ runtime }) => {
      this.hasGoRuntime = this.hasGoRuntime || isGoRuntime(runtime);
      this.hasNodeRuntime = this.hasNodeRuntime || isNodeRuntime(runtime);
      this.hasDotnetRuntime = this.hasDotnetRuntime || isDotnetRuntime(runtime);
    });

    // start watching .go files
    if (!hasGoRuntimeOld && this.hasGoRuntime) {
      logger.debug("handleUpdateLambdaHandlers watch Go");
      this.onAddWatchedFiles(["**/*.go"]);
    }
    // stop watching .go files
    else if (hasGoRuntimeOld && !this.hasGoRuntime) {
      logger.debug("handleUpdateLambdaHandlers unwatch Go");
      this.onRemoveWatchedFiles(["**/*.go"]);
    }

    // start watching .cs files
    if (!hasDotnetRuntimeOld && this.hasDotnetRuntime) {
      logger.debug("handleUpdateLambdaHandlers watch .NET");
      this.onAddWatchedFiles(["**/*.cs", "**/*.csproj"]);
    }
    // stop watching .cs files
    else if (hasDotnetRuntimeOld && !this.hasDotnetRuntime) {
      logger.debug("handleUpdateLambdaHandlers unwatch .NET");
      this.onRemoveWatchedFiles(["**/*.cs", "**/*.csproj"]);
    }

    // Add new entrypoints
    const dotnetBuildPromisesBySrcPath = {};
    lambdaHandlers.forEach((lambdaHandler) => {
      const { srcPath, handler, runtime, bundle } = lambdaHandler;
      const key = this.buildEntryPointKey(srcPath, handler);
      // entrypoint NOT exist => initializeEntryPoint
      if (!this.state.entryPointsData[key]) {
        logger.debug("handleUpdateLambdaHandlers add entryPoint", key);

        this.initializeEntryPoint(lambdaHandler);
        const onSuccess = (data) =>
          this.handleNewEntryPointBuildSucceeded(srcPath, handler, data);
        const onFailure = () =>
          this.handleNewEntryPointBuildFailed(srcPath, handler);
        let buildPromise;
        if (isDotnetRuntime(runtime)) {
          // build once per srcPath
          buildPromise = dotnetBuildPromisesBySrcPath[srcPath];
          if (!buildPromise) {
            buildPromise = this.onBuildDotnet({
              srcPath,
              handler,
              onSuccess,
              onFailure,
            });
            dotnetBuildPromisesBySrcPath[srcPath] = buildPromise;
          }
        } else if (isGoRuntime(runtime)) {
          buildPromise = this.onCompileGo({
            srcPath,
            handler,
            onSuccess,
            onFailure,
          });
        } else if (isPythonRuntime(runtime)) {
          buildPromise = this.onBuildPython({
            srcPath,
            handler,
            onSuccess,
            onFailure,
          });
        } else if (isNodeRuntime(runtime)) {
          buildPromise = this.onTranspileNode({
            srcPath,
            handler,
            bundle,
            onSuccess,
            onFailure,
          });
        }
        this.state.entryPointsData[key].buildPromise = buildPromise;
      }
    });

    // Remove entrypoints no long exists
    const lambdaHandlerKeys = lambdaHandlers.map(({ srcPath, handler }) =>
      this.buildEntryPointKey(srcPath, handler)
    );
    Object.keys(this.state.entryPointsData)
      .filter((key) => !lambdaHandlerKeys.includes(key))
      .forEach((key) => {
        logger.debug("handleUpdateLambdaHandlers remove entryPoint", key);
        this.removeEntryPoint(key);
      });
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

    // .NET specific handling
    if (isDotnetRuntime(this.state.entryPointsData[key].runtime)) {
      // Note: Mark all entrypoints with the same srcPath as build succeeded
      Object.keys(this.state.entryPointsData)
        .filter(
          (per) =>
            isDotnetRuntime(this.state.entryPointsData[per].runtime) &&
            this.state.entryPointsData[per].srcPath === srcPath &&
            this.state.entryPointsData[per].handler !== handler
        )
        .forEach((per) => {
          this.state.entryPointsData[per] = {
            ...this.state.entryPointsData[per],
            inputFiles,
            outEntryPoint: {
              entry: outEntryPoint.entry,
              handler: this.state.entryPointsData[per].handler,
              origHandlerFullPosixPath: this.getHandlerFullPosixPath(
                this.state.entryPointsData[per].srcPath,
                this.state.entryPointsData[per].handler
              ),
            },
          };
        });
    }

    // Node specific handling
    if (isNodeRuntime(this.state.entryPointsData[key].runtime)) {
      // Update srcPath index
      this.state.srcPathsData[srcPath] = {
        ...srcPathDataTemplateObject,
        srcPath,
        tsconfig,
        needsReCheck: true,
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
  handleNewEntryPointBuildSucceeded(
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
      buildPromise: null,
    };

    // Fullfil pending requests
    this.state.entryPointsData[
      key
    ].pendingRequestCallbacks.forEach(({ resolve }) => resolve());

    // .NET specific handling
    if (isDotnetRuntime(this.state.entryPointsData[key].runtime)) {
      // Note: Mark all entrypoints with the same srcPath as build succeeded
      Object.keys(this.state.entryPointsData)
        .filter(
          (per) =>
            isDotnetRuntime(this.state.entryPointsData[per].runtime) &&
            this.state.entryPointsData[per].srcPath === srcPath &&
            this.state.entryPointsData[per].handler !== handler
        )
        .forEach((per) => {
          // Update entryPointsData
          this.state.entryPointsData[per] = {
            ...this.state.entryPointsData[per],
            inputFiles,
            outEntryPoint: {
              entry: outEntryPoint.entry,
              handler: this.state.entryPointsData[per].handler,
              origHandlerFullPosixPath: this.getHandlerFullPosixPath(
                this.state.entryPointsData[per].srcPath,
                this.state.entryPointsData[per].handler
              ),
            },
            buildPromise: null,
          };
          // Fullfil pending requests
          this.state.entryPointsData[
            per
          ].pendingRequestCallbacks.forEach(({ resolve }) => resolve());
        });
    }

    // Node specific handling
    if (isNodeRuntime(this.state.entryPointsData[key].runtime)) {
      // Update srcPath index
      this.state.srcPathsData[srcPath] = {
        ...srcPathDataTemplateObject,
        srcPath,
        tsconfig,
        needsReCheck: true,
        inputFiles: this.getSrcPathInputFiles(srcPath),
      };

      // Update inputFiles
      this.addEntryPointToWatchedNodeFiles(key, inputFiles);
    }

    // Update state
    this.updateState();
  }
  handleNewEntryPointBuildFailed(srcPath, handler) {
    this.handleReBuildFailed(srcPath, handler);
  }
  handleReBuildSucceeded(
    srcPath,
    handler,
    { tsconfig, esbuilder, outEntryPoint, inputFiles }
  ) {
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
      tsconfig,
      esbuilder,
      inputFiles,
      outEntryPoint,
      buildPromise: null,
      hasError: false,
      needsReBuild,
    };

    // Fullfil pending requests
    this.state.entryPointsData[
      key
    ].pendingRequestCallbacks.forEach(({ resolve }) => resolve());

    // .NET specific handling
    if (isDotnetRuntime(this.state.entryPointsData[key].runtime)) {
      // Note: Mark all entrypoints with the same srcPath as build succeeded
      Object.keys(this.state.entryPointsData)
        .filter(
          (per) =>
            isDotnetRuntime(this.state.entryPointsData[per].runtime) &&
            this.state.entryPointsData[per].srcPath === srcPath &&
            this.state.entryPointsData[per].handler !== handler
        )
        .forEach((per) => {
          // Update entryPointsData
          this.state.entryPointsData[per] = {
            ...this.state.entryPointsData[per],
            inputFiles,
            outEntryPoint: {
              entry: outEntryPoint.entry,
              handler: this.state.entryPointsData[per].handler,
              origHandlerFullPosixPath: this.getHandlerFullPosixPath(
                this.state.entryPointsData[per].srcPath,
                this.state.entryPointsData[per].handler
              ),
            },
            buildPromise: null,
            hasError: false,
            needsReBuild,
          };
          // Fullfil pending requests
          this.state.entryPointsData[
            per
          ].pendingRequestCallbacks.forEach(({ resolve }) => resolve());
        });
    }

    // Handle Node runtime => Run lint and type check
    if (isNodeRuntime(this.state.entryPointsData[key].runtime)) {
      // Update srcPathsData
      this.state.srcPathsData[srcPath] = {
        ...this.state.srcPathsData[srcPath],
        srcPath,
        tsconfig,
        needsReCheck: true,
        inputFiles: this.getSrcPathInputFiles(srcPath),
      };

      // Update watchedNodeFilesIndex
      this.addEntryPointToWatchedNodeFiles(key, inputFilesDiff.add);
      this.removeEntryPointFromWatchedNodeFiles(key, inputFilesDiff.remove);
    }

    // Update state
    this.updateState();
  }
  handleReBuildFailed(srcPath, handler) {
    const key = this.buildEntryPointKey(srcPath, handler);
    const { pendingRequestCallbacks } = this.state.entryPointsData[key];

    // Fullfil pending requests
    pendingRequestCallbacks.forEach(({ reject }) =>
      reject(
        new Error(
          srcPath === "."
            ? `Failed to build the Lambda handler for "${handler}"`
            : `Failed to build the Lambda handler for "${srcPath}/${handler}"`
        )
      )
    );

    // Update entryPointsData
    this.state.entryPointsData[key] = {
      ...this.state.entryPointsData[key],
      hasError: true,
      buildPromise: null,
      pendingRequestCallbacks: [],
    };

    // .NET specific handling
    if (isDotnetRuntime(this.state.entryPointsData[key].runtime)) {
      // Note: Mark all entrypoints with the same srcPath as build succeeded
      Object.keys(this.state.entryPointsData)
        .filter(
          (per) =>
            isDotnetRuntime(this.state.entryPointsData[per].runtime) &&
            this.state.entryPointsData[per].srcPath === srcPath &&
            this.state.entryPointsData[per].handler !== handler
        )
        .forEach((per) => {
          const { handler, srcPath } = this.state.entryPointsData[per];
          // Fullfil pending requests
          this.state.entryPointsData[
            per
          ].pendingRequestCallbacks.forEach(({ reject }) =>
            reject(
              new Error(
                srcPath === "."
                  ? `Failed to build the Lambda handler for "${handler}"`
                  : `Failed to build the Lambda handler for "${srcPath}/${handler}"`
              )
            )
          );
          // Update entryPointsData
          this.state.entryPointsData[per] = {
            ...this.state.entryPointsData[per],
            hasError: true,
            buildPromise: null,
            pendingRequestCallbacks: [],
          };
        });
    }

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

  getHandlerFullPosixPath(srcPath, handler) {
    return srcPath === "." ? handler : `${srcPath}/${handler}`;
  }
  buildEntryPointKey(srcPath, handler) {
    return `${srcPath}/${handler}`;
  }
  getSrcPathInputFiles(srcPath) {
    const srcPathInputFiles = Object.values(this.state.entryPointsData)
      .filter(({ srcPath: entryPointSrcPath }) => entryPointSrcPath === srcPath)
      .map(({ inputFiles }) => inputFiles);
    return array.unique(array.flatten(srcPathInputFiles));
  }
  initializeEntryPoint({ srcPath, handler, runtime, bundle }) {
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
  }
  addEntryPointToWatchedNodeFiles(key, inputFiles) {
    const addWatchFiles = [];

    // Update watched files index
    inputFiles.forEach((file) => {
      // the file was not being watched before
      if (!this.state.watchedNodeFilesIndex[file]) {
        addWatchFiles.push(file);
        this.state.watchedNodeFilesIndex[file] = [];
      }
      this.state.watchedNodeFilesIndex[file].push(key);
    });

    // Update watcher
    this.onAddWatchedFiles(addWatchFiles);
  }
  removeEntryPoint(key) {
    // Update entryPointsData
    // - stop esbuilder
    // - reject pending requests
    // - remove entryPoint
    const {
      srcPath,
      handler,
      runtime,
      inputFiles,
      esbuilder,
      pendingRequestCallbacks,
    } = this.state.entryPointsData[key];
    esbuilder && esbuilder.rebuild.dispose();
    pendingRequestCallbacks.forEach(({ reject }) =>
      reject(
        new Error(
          `Lambda has been removed for srcPath ${srcPath} handler ${handler}`
        )
      )
    );
    delete this.state.entryPointsData[key];

    if (isNodeRuntime(runtime)) {
      // Update srcPathsData
      const srcPathStillInUse = Object.values(this.state.entryPointsData).some(
        ({ srcPath: entryPointSrcPath }) => entryPointSrcPath === srcPath
      );
      // no entryPoint with the same srcPath => remove srcPath
      // - stop lintProcess
      // - stop typeCheckProcess
      // - remove srcPath
      if (!srcPathStillInUse) {
        const { lintProcess, typeCheckProcess } = this.state.srcPathsData[
          srcPath
        ];
        lintProcess && lintProcess.kill();
        typeCheckProcess && typeCheckProcess.kill();
        delete this.state.srcPathsData[srcPath];
      }
      // has entryPoint with the same srcPath => update srcPath
      // - update inputFiles
      else {
        this.state.srcPathsData[srcPath].inputFiles = this.getSrcPathInputFiles(
          srcPath
        );
      }

      // Update watchedNodeFilesIndex
      this.removeEntryPointFromWatchedNodeFiles(key, inputFiles);
    }
  }
  removeEntryPointFromWatchedNodeFiles(key, inputFiles) {
    const removeWatchFiles = [];

    inputFiles.forEach((file) => {
      const index = this.state.watchedNodeFilesIndex[file].indexOf(key);
      if (index > -1) {
        this.state.watchedNodeFilesIndex[file].splice(index, 1);
      }
      // the file no longer need to be watched
      if (this.state.watchedNodeFilesIndex[file].length === 0) {
        removeWatchFiles.push(file);
        delete this.state.watchedNodeFilesIndex[file];
      }
    });

    // Update watcher
    this.onRemoveWatchedFiles(removeWatchFiles);
  }

  updateState() {
    logger.trace(this.serializeState());

    const { entryPointsData, srcPathsData } = this.state;

    // Print state busy status
    this.updateBusyStatus();

    // Gather build data
    const goEPsBuilding = [];
    const goEPsNeedsRebuild = [];
    const nodeEPsNeedsRebuild = [];
    const dotnetEPsNeedsRebuild = [];
    Object.values(entryPointsData).forEach((entryPoint) => {
      const { runtime, buildPromise, needsReBuild } = entryPoint;
      // handle Go runtime: construct goEPsNeedsRebuild array with HIGH priority first
      if (isGoRuntime(runtime)) {
        if (buildPromise) {
          goEPsBuilding.push(entryPoint);
        } else if (needsReBuild === REBUILD_PRIORITY.LOW) {
          // add to the end
          goEPsNeedsRebuild.push(entryPoint);
        } else if (needsReBuild === REBUILD_PRIORITY.HIGH) {
          // add to the beginning
          goEPsNeedsRebuild.unshift(entryPoint);
        }
      }
      // handle Node runtime
      if (isNodeRuntime(runtime)) {
        if (!buildPromise && needsReBuild) {
          nodeEPsNeedsRebuild.push(entryPoint);
        }
      }
      // handle .NET runtime
      if (isDotnetRuntime(runtime)) {
        if (!buildPromise && needsReBuild) {
          dotnetEPsNeedsRebuild.push(entryPoint);
        }
      }
    });

    // Build all Node entry points
    nodeEPsNeedsRebuild.forEach(({ srcPath, handler }) => {
      const key = this.buildEntryPointKey(srcPath, handler);
      const { esbuilder } = this.state.entryPointsData[key];
      const onSuccess = (data) =>
        this.handleReBuildSucceeded(srcPath, handler, data);
      const onFailure = () => this.handleReBuildFailed(srcPath, handler);
      this.state.entryPointsData[key].needsReBuild = REBUILD_PRIORITY.OFF;
      this.state.entryPointsData[key].buildPromise = this.onTranspileNode({
        srcPath,
        handler,
        esbuilder,
        onSuccess,
        onFailure,
      });
    });

    // Build Go entry points if concurrency is not saturated
    const concurrencyUsed = goEPsBuilding.length;
    const concurrencyRemaining = BUILDER_CONCURRENCY - concurrencyUsed;
    goEPsNeedsRebuild
      .slice(0, concurrencyRemaining)
      .forEach(({ srcPath, handler }) => {
        const key = this.buildEntryPointKey(srcPath, handler);
        const onSuccess = (data) =>
          this.handleReBuildSucceeded(srcPath, handler, data);
        const onFailure = () => this.handleReBuildFailed(srcPath, handler);
        this.state.entryPointsData[key].needsReBuild = REBUILD_PRIORITY.OFF;
        this.state.entryPointsData[key].buildPromise = this.onCompileGo({
          srcPath,
          handler,
          onSuccess,
          onFailure,
        });
      });

    // Build .NET entry points
    // Note: only need to build once per srcPath. All handlers in a srcPath
    //       are built into the same package.
    const dotnetBuildPromisesBySrcPath = {};
    dotnetEPsNeedsRebuild.forEach(({ srcPath, handler }) => {
      const onSuccess = (data) =>
        this.handleReBuildSucceeded(srcPath, handler, data);
      const onFailure = () => this.handleReBuildFailed(srcPath, handler);
      let buildPromise = dotnetBuildPromisesBySrcPath[srcPath];
      if (!buildPromise) {
        buildPromise = this.onBuildDotnet({
          srcPath,
          handler,
          onSuccess,
          onFailure,
        });
        dotnetBuildPromisesBySrcPath[srcPath] = buildPromise;
      }
      // mark all entryPoints in the same srcPath building
      dotnetEPsNeedsRebuild
        .filter((ep) => ep.srcPath === srcPath)
        .forEach((ep) => {
          const key = this.buildEntryPointKey(ep.srcPath, ep.handler);
          this.state.entryPointsData[key].needsReBuild = REBUILD_PRIORITY.OFF;
          this.state.entryPointsData[key].buildPromise = buildPromise;
        });
    });

    // Check all entrypoints transpiled, if not => wait
    const isTranspiling = Object.values(entryPointsData).some(
      ({ buildPromise }) => buildPromise
    );
    if (isTranspiling) {
      return;
    }

    // Check all entrypoints successfully transpiled, if not => do not run lint and checker
    const hasError = Object.values(entryPointsData).some(
      ({ hasError }) => hasError
    );
    if (hasError) {
      return;
    }

    // Run linter and type checker
    Object.keys(srcPathsData).forEach((srcPath) => {
      let {
        lintProcess,
        typeCheckProcess,
        needsReCheck,
        inputFiles,
        tsconfig,
      } = srcPathsData[srcPath];
      if (needsReCheck) {
        // stop existing linter & type checker
        lintProcess && lintProcess.kill();
        typeCheckProcess && typeCheckProcess.kill();

        // start new linter & type checker
        // - lintProcess can be null if lint is disabled
        // - typeCheck can be null if type check is disabled, or there is no typescript files
        srcPathsData[srcPath].needsReCheck = false;
        srcPathsData[srcPath].lintProcess = this.onRunLint(srcPath, inputFiles);
        srcPathsData[srcPath].typeCheckProcess = this.onRunTypeCheck(
          srcPath,
          inputFiles,
          tsconfig
        );
      }
    });
  }
  updateBusyStatus() {
    const { entryPointsData, srcPathsData } = this.state;

    // Check status change NOT BUSY => BUSY
    if (!this.state.isProcessingLambdaChanges) {
      // some entry points needs to re-build => BUSY
      const needsReBuild = Object.values(entryPointsData).some(
        ({ needsReBuild }) => needsReBuild
      );
      if (!needsReBuild) {
        return;
      }

      this.state.isProcessingLambdaChanges = true;
      logger.info(chalk.grey("Rebuilding code..."));
    }

    // Check status change BUSY => NOT BUSY
    else {
      // some entry points are building or needs to re-build => BUSY
      const isBuilding = Object.values(entryPointsData).some(
        ({ needsReBuild, buildPromise }) => needsReBuild || buildPromise
      );
      if (isBuilding) {
        return;
      }

      // some entry points failed to build => NOT BUSY (b/c not going to lint and type check)
      const hasError = Object.values(entryPointsData).some(
        ({ hasError }) => hasError
      );
      if (hasError) {
        this.state.isProcessingLambdaChanges = false;
        logger.info("Rebuilding code failed");
        return;
      }

      // some srcPaths are linting, type-checking, or need to re-check => BUSY
      const isChecking = Object.values(srcPathsData).some(
        ({ needsReCheck, lintProcess, typeCheckProcess }) =>
          needsReCheck || lintProcess || typeCheckProcess
      );
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
            buildPromise: entryPointsData[key].buildPromise && "<Promise>",
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
};
