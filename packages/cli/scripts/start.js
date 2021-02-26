"use strict";

const path = require("path");
const fs = require("fs-extra");
const chalk = require("chalk");
const WebSocket = require("ws");
const esbuild = require("esbuild");
const chokidar = require("chokidar");
const spawn = require("cross-spawn");
const allSettled = require("promise.allsettled");
const { logger, getChildLogger } = require("@serverless-stack/core");

const sstBuild = require("./build");
const sstDeploy = require("./deploy");
const paths = require("./util/paths");
const {
  prepareCdk,
  applyConfig,
  getTsBinPath,
  getEsbuildTarget,
  deploy: cdkDeploy,
  bootstrap: cdkBootstrap,
} = require("./util/cdkHelpers");
const array = require("../lib/array");
const { deserializeError } = require("../lib/serializeError");

// Setup logger
const clientLogger = getChildLogger("client");
const builderLogger = getChildLogger("builder");

// Create Promise.allSettled shim
allSettled.shim();

const chokidarOptions = {
  persistent: true,
  ignoreInitial: true,
  followSymlinks: false,
  disableGlobbing: false,
  awaitWriteFinish: {
    pollInterval: 100,
    stabilityThreshold: 20,
  },
};
const WEBSOCKET_CLOSE_CODE = {
  NEW_CLIENT_CONNECTED: 4901,
};

let watcher;
let esbuildService;
let isLintingEnabled;

const builderState = {
  isRebuilding: false,
  entryPointsData: {}, // KEY: $srcPath/$entry/$handler
  srcPathsData: {}, // KEY: $srcPath
  watchedFilesIndex: {}, // KEY: /path/to/lambda.js          VALUE: [ entryPoint ]
  watchedCdkFilesIndex: {}, // KEY: /path/to//MyStack.js        VALUE: true
};
const entryPointDataTemplateObject = {
  srcPath: null,
  handler: null,
  tsconfig: null,
  hasError: false,
  esbuilder: null,
  inputFiles: null,
  outEntryPoint: null,
  transpilePromise: null,
  needsReTranspile: false,
  pendingRequestCallbacks: [],
};
const srcPathDataTemplateObject = {
  srcPath: null,
  tsconfig: null,
  inputFiles: null,
  lintProcess: null,
  needsReCheck: false,
  typeCheckProcess: null,
};

const clientState = {
  ws: null,
  wsKeepAliveTimer: null,
};

const MOCK_SLOW_ESBUILD_RETRANSPILE_IN_MS = 0;
const IS_TEST = process.env.__TEST__ === "true";

module.exports = async function (argv, cliInfo) {
  const config = await applyConfig(argv);

  // Deploy debug stack
  config.debugEndpoint = await deployDebugStack(argv, cliInfo, config);

  // Deploy app
  const cdkInputFiles = await deployApp(argv, cliInfo, config);

  // Start builder
  isLintingEnabled = config.lint;
  await startBuilder(cdkInputFiles);

  // Start client
  startClient(config.debugEndpoint);
};

async function deployDebugStack(argv, cliInfo, config) {
  // Do not deploy if running test
  if (IS_TEST) {
    return "ws://test-endpoint";
  }

  const stackName = `${config.stage}-${config.name}-debug-stack`;

  logger.info("");
  logger.info("=======================");
  logger.info(" Deploying debug stack");
  logger.info("=======================");
  logger.info("");

  const debugAppArgs = [stackName, config.stage, config.region];
  // Note: When deploying the debug stack, the current working directory is user's app.
  //       Setting the current working directory to debug stack cdk app directory to allow
  //       Lambda Function construct be able to reference code with relative path.
  process.chdir(path.join(paths.ownPath, "assets", "debug-stack"));
  let debugStackRet;
  try {
    const cdkOptions = {
      ...cliInfo.cdkOptions,
      app: `node bin/index.js ${debugAppArgs.join(" ")}`,
      output: "cdk.out",
    };
    await cdkBootstrap(cdkOptions);
    debugStackRet = await cdkDeploy(cdkOptions);
  } catch (e) {
    logger.error(e);
  }

  // Note: Restore working directory
  process.chdir(paths.appPath);

  // Get WebSocket endpoint
  if (
    !debugStackRet ||
    !debugStackRet.outputs ||
    !debugStackRet.outputs.Endpoint
  ) {
    throw new Error(
      `Failed to get the endpoint from the deployed debug stack ${stackName}`
    );
  }

  return debugStackRet.outputs.Endpoint;
}
async function deployApp(argv, cliInfo, config) {
  logger.info("");
  logger.info("===============");
  logger.info(" Deploying app");
  logger.info("===============");
  logger.info("");

  const { inputFiles } = await prepareCdk(argv, cliInfo, config);

  // When testing, we will do a build call to generate the lambda-handler.json
  if (IS_TEST) {
    await sstBuild(argv, config, cliInfo);
  } else {
    const stacks = await sstDeploy(argv, config, cliInfo);

    // Check all stacks deployed successfully
    if (stacks.some((stack) => stack.status === "failed")) {
      throw new Error(`Failed to deploy the app`);
    }
  }

  return inputFiles;
}

///////////////////////
// Builder functions //
///////////////////////

async function startBuilder(cdkInputFiles) {
  builderLogger.info("");
  builderLogger.info("===================");
  builderLogger.info(" Starting debugger");
  builderLogger.info("===================");
  builderLogger.info("");

  // Load Lambda handlers to watch
  // ie. { srcPath: "src/api", handler: "api.main" },
  const lambdaHandlersPath = path.join(
    paths.appPath,
    paths.appBuildDir,
    "lambda-handlers.json"
  );
  const entryPoints = await fs.readJson(lambdaHandlersPath);
  if (!(await checkFileExists(lambdaHandlersPath))) {
    throw new Error(`Failed to get the Lambda handlers info from the app`);
  }

  // Initialize state
  initializeBuilderState(entryPoints, cdkInputFiles);

  // Run transpiler
  builderLogger.info(chalk.grey("Transpiling Lambda code..."));

  esbuildService = await esbuild.startService();
  const results = await Promise.allSettled(
    entryPoints.map(({ srcPath, handler }) =>
      // Not catching esbuild errors
      // Letting it handle the error messages for now
      transpile(srcPath, handler)
    )
  );

  const hasError = results.some((result) => result.status === "rejected");
  if (hasError) {
    stopBuilder();
    throw new Error("Error transpiling");
  }

  // Running inside test => stop builder
  if (IS_TEST) {
    const testOutputPath = path.join(
      paths.appPath,
      paths.appBuildDir,
      "test-output.json"
    );
    fs.writeFileSync(testOutputPath, JSON.stringify(builderState));
    stopBuilder();
    return;
  }

  // Validate transpiled
  const srcPaths = getAllSrcPaths();
  if (srcPaths.length === 0) {
    builderLogger.info("Nothing has been transpiled");
    return;
  }

  await Promise.all(
    srcPaths.map(async (srcPath) => {
      const lintProcess = runLint(srcPath);
      const typeCheckProcess = runTypeCheck(srcPath);
      await onLintAndTypeCheckStarted({
        srcPath,
        lintProcess,
        typeCheckProcess,
      });
    })
  );

  // Run watcher
  const allInputFiles = getAllWatchedFiles();
  watcher = chokidar
    .watch(allInputFiles, chokidarOptions)
    .on("all", onFileChange)
    .on("error", (error) => builderLogger.info(`Watch ${error}`))
    .on("ready", () => {
      builderLogger.debug(`Watcher ready for ${allInputFiles.length} files...`);
    });
}
function stopBuilder() {
  // Stop esbuild rebuild processes
  Object.keys(builderState.entryPointsData).forEach((key) => {
    if (builderState.entryPointsData[key].esbuilder !== null) {
      builderState.entryPointsData[key].esbuilder.rebuild.dispose();
    }
  });

  // Stop esbuild service
  if (esbuildService) {
    esbuildService.stop();
  }
}
async function updateBuilder() {
  builderLogger.trace(serializeState());

  const { entryPointsData, srcPathsData } = builderState;

  // Run transpiler
  Object.keys(entryPointsData).forEach((key) => {
    let {
      srcPath,
      handler,
      transpilePromise,
      needsReTranspile,
    } = entryPointsData[key];
    if (!transpilePromise && needsReTranspile) {
      const transpilePromise = reTranspiler(srcPath, handler);
      onReTranspileStarted({ srcPath, handler, transpilePromise });
    }
  });

  // Check all entrypoints transpiled, if not => wait
  const isTranspiling = Object.keys(entryPointsData).some(
    (key) => entryPointsData[key].transpilePromise
  );
  if (isTranspiling) {
    return;
  }

  // Check all entrypoints successfully transpiled, if not => do not run lint and checker
  const hasError = Object.keys(entryPointsData).some(
    (key) => entryPointsData[key].hasError
  );
  if (hasError) {
    return;
  }

  // Run linter and type checker
  await Promise.all(
    Object.keys(srcPathsData).map(async (srcPath) => {
      let { lintProcess, typeCheckProcess, needsReCheck } = srcPathsData[
        srcPath
      ];
      if (needsReCheck) {
        // stop existing linter & type checker
        lintProcess && lintProcess.kill();
        typeCheckProcess && typeCheckProcess.kill();

        // start new linter & type checker
        lintProcess = runLint(srcPath);
        typeCheckProcess = runTypeCheck(srcPath);

        await onLintAndTypeCheckStarted({
          srcPath,
          lintProcess,
          typeCheckProcess,
        });
      }
    })
  );
}

async function onFileChange(ev, file) {
  builderLogger.debug(`File change: ${file}`);

  // Handle CDK code changed
  if (builderState.watchedCdkFilesIndex[file]) {
    builderLogger.info(
      "Detected a change in your CDK constructs. Restart the debugger to deploy the changes."
    );
    return;
  }

  // Get entrypoints changed
  const entryPointKeys = builderState.watchedFilesIndex[file];
  if (!entryPointKeys) {
    builderLogger.debug("File is not linked to the entry points");
    return;
  }

  // Mark changed entrypoints
  entryPointKeys.map((key) => {
    builderState.entryPointsData[key].needsReTranspile = true;
  });

  await updateBuilder();
}
function onTranspileSucceeded(
  srcPath,
  handler,
  { tsconfig, esbuilder, outEntryPoint, inputFiles }
) {
  const key = buildEntryPointKey(srcPath, handler);
  // Update entryPointsData
  builderState.entryPointsData[key] = {
    ...builderState.entryPointsData[key],
    tsconfig,
    esbuilder,
    inputFiles,
    outEntryPoint,
  };

  // Update srcPath index
  builderState.srcPathsData[srcPath] = {
    ...srcPathDataTemplateObject,
    srcPath,
    tsconfig,
    inputFiles,
  };

  // Update inputFiles
  inputFiles.forEach((file) => {
    builderState.watchedFilesIndex[file] =
      builderState.watchedFilesIndex[file] || [];
    builderState.watchedFilesIndex[file].push(key);
  });
}
function onReTranspileStarted({ srcPath, handler, transpilePromise }) {
  const key = buildEntryPointKey(srcPath, handler);

  // Print rebuilding message
  if (!builderState.isRebuilding) {
    builderState.isRebuilding = true;
    builderLogger.info("Rebuilding...");
  }

  // Update entryPointsData
  builderState.entryPointsData[key] = {
    ...builderState.entryPointsData[key],
    needsReTranspile: false,
    transpilePromise,
  };
}
async function onReTranspileSucceeded(srcPath, handler, { inputFiles }) {
  const key = buildEntryPointKey(srcPath, handler);

  // Note: If the handler included new files, while re-transpiling, the new files
  //       might have been updated. And because the new files has not been added to
  //       the watcher yet, onFileChange() wouldn't get called. We need to re-transpile
  //       again.
  const oldInputFiles = builderState.entryPointsData[key].inputFiles;
  const inputFilesDiff = diffInputFiles(oldInputFiles, inputFiles);
  const hasNewInputFiles = inputFilesDiff.add.length > 0;

  // Update entryPointsData
  builderState.entryPointsData[key] = {
    ...builderState.entryPointsData[key],
    inputFiles,
    hasError: false,
    transpilePromise: null,
    needsReTranspile:
      builderState.entryPointsData[key].needsReTranspile || hasNewInputFiles,
  };

  // Update srcPathsData
  const srcPathInputFiles = Object.keys(builderState.entryPointsData)
    .filter((key) => builderState.entryPointsData[key].srcPath === srcPath)
    .map((key) => builderState.entryPointsData[key].inputFiles)
    .flat();
  builderState.srcPathsData[srcPath] = {
    ...builderState.srcPathsData[srcPath],
    inputFiles: array.unique(srcPathInputFiles),
    needsReCheck: true,
  };

  // Update watched files index
  inputFilesDiff.add.forEach((file) => {
    builderState.watchedFilesIndex[file] =
      builderState.watchedFilesIndex[file] || [];
    builderState.watchedFilesIndex[file].push(key);
  });
  inputFilesDiff.remove.forEach((file) => {
    const index = builderState.watchedFilesIndex[file].indexOf(key);
    if (index > -1) {
      builderState.watchedFilesIndex[file].splice(index, 1);
    }
    if (builderState.watchedFilesIndex[file] === 0) {
      delete builderState.watchedFilesIndex[file];
    }
  });

  // Update watcher
  if (inputFilesDiff.add.length > 0) {
    watcher.add(inputFilesDiff.add);
  }
  if (inputFilesDiff.remove.length > 0) {
    await watcher.unwatch(inputFilesDiff.remove);
  }

  // Fullfil pending requests
  if (!builderState.entryPointsData[key].needsReTranspile) {
    builderState.entryPointsData[key].pendingRequestCallbacks.forEach(
      ({ resolve }) => {
        resolve();
      }
    );
  }

  await updateBuilder();
}
async function onReTranspileFailed(srcPath, handler) {
  const key = buildEntryPointKey(srcPath, handler);

  // Update entryPointsData
  builderState.entryPointsData[key] = {
    ...builderState.entryPointsData[key],
    hasError: true,
    transpilePromise: null,
  };

  // Fullfil pending requests
  if (!builderState.entryPointsData[key].needsReTranspile) {
    builderState.entryPointsData[key].pendingRequestCallbacks.forEach(
      ({ reject }) => {
        reject(`Failed to transpile srcPath ${srcPath} handler ${handler}`);
      }
    );
  }

  await updateBuilder();
}
async function onLintAndTypeCheckStarted({
  srcPath,
  lintProcess,
  typeCheckProcess,
}) {
  // Note:
  // - lintProcess can be null if linting is disabled
  // - typeCheck can be null if there is no typescript files

  // Update srcPath index
  builderState.srcPathsData[srcPath] = {
    ...builderState.srcPathsData[srcPath],
    lintProcess,
    typeCheckProcess,
    needsReCheck: false,
  };

  // Print rebuilding message
  const isChecking = Object.keys(builderState.srcPathsData).some(
    (key) =>
      builderState.srcPathsData[key].lintProcess ||
      builderState.srcPathsData[key].typeCheckProcess
  );
  if (!isChecking && builderState.isRebuilding) {
    builderState.isRebuilding = false;
    builderLogger.info("Done building");
  }

  await updateBuilder();
}
async function onLintDone(srcPath) {
  builderState.srcPathsData[srcPath] = {
    ...builderState.srcPathsData[srcPath],
    lintProcess: null,
  };

  // Print rebuilding message
  const isChecking = Object.keys(builderState.srcPathsData).some(
    (key) =>
      builderState.srcPathsData[key].lintProcess ||
      builderState.srcPathsData[key].typeCheckProcess
  );
  if (!isChecking && builderState.isRebuilding) {
    builderState.isRebuilding = false;
    builderLogger.info("Done building");
  }

  await updateBuilder();
}
async function onTypeCheckDone(srcPath) {
  builderState.srcPathsData[srcPath] = {
    ...builderState.srcPathsData[srcPath],
    typeCheckProcess: null,
  };

  // Print rebuilding message
  const isChecking = Object.keys(builderState.srcPathsData).some(
    (key) =>
      builderState.srcPathsData[key].lintProcess ||
      builderState.srcPathsData[key].typeCheckProcess
  );
  if (!isChecking && builderState.isRebuilding) {
    builderState.isRebuilding = false;
    builderLogger.info("Done building");
  }

  await updateBuilder();
}

async function transpile(srcPath, handler) {
  // Sample input:
  //  srcPath     'service'
  //  handler     'src/lambda.handler'
  //
  // Sample output path:
  //  metafile    'services/user-service/.build/.esbuild.service-src-lambda-hander.json'
  //  fullPath    'services/user-service/src/lambda.js'
  //  outSrcPath  'services/user-service/.build/src'
  //
  // Transpiled .js and .js.map are output in .build folder with original handler structure path

  const metafile = getEsbuildMetafilePath(srcPath, handler);
  const fullPath = await getHandlerFilePath(srcPath, handler);
  const outSrcPath = path.join(
    srcPath,
    paths.appBuildDir,
    path.dirname(handler)
  );

  const tsconfigPath = path.join(paths.appPath, srcPath, "tsconfig.json");
  const isTs = await checkFileExists(tsconfigPath);
  const tsconfig = isTs ? tsconfigPath : undefined;

  const external = await getAllExternalsForHandler(srcPath);

  const esbuildOptions = {
    external,
    metafile,
    tsconfig,
    bundle: true,
    format: "cjs",
    sourcemap: true,
    platform: "node",
    incremental: true,
    entryPoints: [fullPath],
    target: [getEsbuildTarget()],
    color: process.env.NO_COLOR !== "true",
    outdir: path.join(paths.appPath, outSrcPath),
  };

  builderLogger.debug(`Transpiling ${handler}...`);

  const esbuilder = await esbuildService.build(esbuildOptions);

  const handlerParts = path.basename(handler).split(".");
  const outHandler = handlerParts.pop();
  const outEntry = `${handlerParts.join(".")}.js`;

  return onTranspileSucceeded(srcPath, handler, {
    tsconfig,
    esbuilder,
    outEntryPoint: {
      entry: outEntry,
      handler: outHandler,
      srcPath: outSrcPath,
      origHandlerFullPosixPath: `${srcPath}/${handler}`,
    },
    inputFiles: await getInputFilesFromEsbuildMetafile(metafile),
  });
}
async function reTranspiler(srcPath, handler) {
  try {
    const key = buildEntryPointKey(srcPath, handler);
    const { esbuilder } = builderState.entryPointsData[key];
    await esbuilder.rebuild();

    // Mock esbuild taking long to rebuild
    if (MOCK_SLOW_ESBUILD_RETRANSPILE_IN_MS) {
      builderLogger.debug(
        `Mock rebuild wait (${MOCK_SLOW_ESBUILD_RETRANSPILE_IN_MS}ms)...`
      );
      await sleep(MOCK_SLOW_ESBUILD_RETRANSPILE_IN_MS);
      builderLogger.debug(`Mock rebuild wait done`);
    }

    const metafile = getEsbuildMetafilePath(srcPath, handler);
    const inputFiles = await getInputFilesFromEsbuildMetafile(metafile);
    await onReTranspileSucceeded(srcPath, handler, { inputFiles });
  } catch (e) {
    builderLogger.error("reTranspiler error", e);
    await onReTranspileFailed(srcPath, handler);
  }
}

function runLint(srcPath) {
  if (!isLintingEnabled) {
    return null;
  }

  let { inputFiles } = builderState.srcPathsData[srcPath];

  inputFiles = inputFiles.filter(
    (file) =>
      file.indexOf("node_modules") === -1 &&
      (file.endsWith(".ts") || file.endsWith(".js"))
  );

  const cp = spawn(
    "node",
    [
      path.join(paths.appBuildPath, "eslint.js"),
      process.env.NO_COLOR === "true" ? "--no-color" : "--color",
      ...inputFiles,
    ],
    { stdio: "inherit", cwd: paths.ownPath }
  );

  cp.on("close", (code) => {
    builderLogger.debug(`linter exited with code ${code}`);
    onLintDone(srcPath);
  });

  return cp;
}
function runTypeCheck(srcPath) {
  const { inputFiles } = builderState.srcPathsData[srcPath];
  const tsFiles = inputFiles.filter((file) => file.endsWith(".ts"));

  if (tsFiles.length === 0) {
    return null;
  }

  const cp = spawn(
    getTsBinPath(),
    [
      "--noEmit",
      "--pretty",
      process.env.NO_COLOR === "true" ? "false" : "true",
    ],
    {
      stdio: "inherit",
      cwd: path.join(paths.appPath, srcPath),
    }
  );

  cp.on("close", (code) => {
    builderLogger.debug(`type checker exited with code ${code}`);
    onTypeCheckDone(srcPath);
  });

  return cp;
}

/////////////////////////////
// Builder State functions //
/////////////////////////////

function initializeBuilderState(entryPoints, cdkInputFiles) {
  // Initialize 'entryPointsData' state
  entryPoints.forEach(({ srcPath, handler }) => {
    const key = buildEntryPointKey(srcPath, handler);
    builderState.entryPointsData[key] = {
      ...entryPointDataTemplateObject,
      srcPath,
      handler,
    };
  });

  // Initialize 'watchedCdkFilesIndex' state
  cdkInputFiles.forEach((file) => {
    builderState.watchedCdkFilesIndex[file] = true;
  });
}

function buildEntryPointKey(srcPath, handler) {
  return `${srcPath}/${handler}`;
}
function getAllWatchedFiles() {
  return [
    ...Object.keys(builderState.watchedFilesIndex),
    ...Object.keys(builderState.watchedCdkFilesIndex),
  ];
}
function getAllSrcPaths() {
  return Object.keys(builderState.srcPathsData);
}
function serializeState() {
  const {
    isRebuilding,
    entryPointsData,
    srcPathsData,
    watchedFilesIndex,
  } = builderState;
  return JSON.stringify(
    {
      isRebuilding,
      entryPointsData: Object.keys(entryPointsData).reduce(
        (acc, key) => ({
          ...acc,
          [key]: {
            hasError: entryPointsData[key].hasError,
            inputFiles: entryPointsData[key].inputFiles,
            transpilePromise:
              entryPointsData[key].transpilePromise && "<Promise>",
            needsReTranspile: entryPointsData[key].needsReTranspile,
          },
          //[key]: { ...entryPointsData[key],
          //  transpilePromise: entryPointsData[key].transpilePromise && '<Promise>'
          //},
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
          //[key]: { ...srcPathsData[key],
          //  lintProcess: srcPathsData[key].lintProcess && '<ChildProcess>',
          //  typeCheckProcess: srcPathsData[key].typeCheckProcess && '<ChildProcess>',
          //},
        }),
        {}
      ),
      watchedFilesIndex,
    },
    null,
    2
  );
}

////////////////////////////
// Builder Util functions //
////////////////////////////

async function checkFileExists(file) {
  return fs.promises
    .access(file, fs.constants.F_OK)
    .then(() => true)
    .catch(() => false);
}

async function getHandlerFilePath(srcPath, handler) {
  const parts = handler.split(".");
  const name = parts[0];

  const tsFile = path.join(paths.appPath, srcPath, `${name}.ts`);
  if (await checkFileExists(tsFile)) {
    return tsFile;
  }

  return path.join(paths.appPath, srcPath, `${name}.js`);
}

async function getAllExternalsForHandler(srcPath) {
  let externals;

  try {
    const packageJson = await fs.readJson(path.join(srcPath, "package.json"));
    externals = Object.keys({
      ...(packageJson.dependencies || {}),
      ...(packageJson.devDependencies || {}),
      ...(packageJson.peerDependencies || {}),
    });
  } catch (e) {
    builderLogger.warn(`No package.json found in ${srcPath}`);
    externals = [];
  }

  return externals;
}

async function getTranspiledHandler(srcPath, handler) {
  const key = buildEntryPointKey(srcPath, handler);
  const entryPointData = builderState.entryPointsData[key];
  if (entryPointData.transpilePromise || entryPointData.needsReTranspile) {
    builderLogger.debug(`Waiting for re-transpiler output for ${handler}...`);
    await new Promise((resolve, reject) =>
      entryPointData.pendingRequestCallbacks.push({ resolve, reject })
    );
    builderLogger.debug(`Waited for re-transpiler output for ${handler}`);
  }

  return entryPointData.outEntryPoint;
}

function getEsbuildMetafilePath(srcPath, handler) {
  const key = `${srcPath}/${handler}`.replace(/[/.]/g, "-");
  const outSrcFullPath = path.join(paths.appPath, srcPath, paths.appBuildDir);

  return path.join(outSrcFullPath, `.esbuild.${key}.json`);
}

async function getInputFilesFromEsbuildMetafile(file) {
  let metaJson;

  try {
    metaJson = await fs.readJson(file);
  } catch (e) {
    builderLogger.error("There was a problem reading the build metafile", e);
  }

  return Object.keys(metaJson.inputs).map((input) => path.resolve(input));
}

function diffInputFiles(oldList, newList) {
  const remove = [];
  const add = [];

  oldList.forEach((item) => newList.indexOf(item) === -1 && remove.push(item));
  newList.forEach((item) => oldList.indexOf(item) === -1 && add.push(item));

  return { add, remove };
}
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

///////////////////////////////
// Websocke Client functions //
///////////////////////////////

function startClient(debugEndpoint) {
  // Do not deploy if running test
  if (IS_TEST) {
    return;
  }

  clientState.ws = new WebSocket(debugEndpoint);

  clientState.ws.on("open", () => {
    clientLogger.debug("WebSocket connection opened");
    clientState.ws.send(JSON.stringify({ action: "client.register" }));
    startKeepAliveMonitor();
  });

  clientState.ws.on("close", (code, reason) => {
    clientLogger.debug("Websocket connection closed", { code, reason });

    // Case: disconnected due to new client connected => do not reconnect
    if (code === WEBSOCKET_CLOSE_CODE.NEW_CLIENT_CONNECTED) {
      return;
    }

    // Case: disconnected due to 10min idle or 2hr WebSocket connection limit => reconnect
    clientLogger.debug("Reconnecting to websocket server...");
    startClient(debugEndpoint);
  });

  clientState.ws.on("error", (e) => {
    clientLogger.error("WebSocket connection error", e);
  });

  clientState.ws.on("message", onClientMessage);
}

function startKeepAliveMonitor() {
  // Cancel existing keep-alive timer
  if (clientState.wsKeepAliveTimer) {
    clientLogger.debug("Clearing existing keep-alive timer...");
    clearTimeout(clientState.wsKeepAliveTimer);
  }

  // Create keep-alive timer
  clientLogger.debug("Creating keep-alive timer...");
  clientState.ws.send(JSON.stringify({ action: "client.heartbeat" }));
  clientState.wsKeepAliveTimer = setInterval(() => {
    if (clientState.ws) {
      clientLogger.debug("Sending keep-alive call");
      clientState.ws.send(JSON.stringify({ action: "client.keepAlive" }));
    }
  }, 60000);
}

async function onClientMessage(message) {
  clientLogger.debug(`Websocket message received: ${message}`);

  const data = JSON.parse(message);

  // Handle actions
  if (data.action === "server.clientRegistered") {
    clientLogger.info("Debug session started. Listening for requests...");
    clientLogger.debug(`Client connection id: ${data.clientConnectionId}`);
    return;
  }
  if (data.action === "server.clientDisconnectedDueToNewClient") {
    clientLogger.warn(
      "A new debug session has been started. This session will be closed..."
    );
    clientState.ws.close(WEBSOCKET_CLOSE_CODE.NEW_CLIENT_CONNECTED);
    return;
  }
  if (data.action === "server.failedToSendResponseDueToStubDisconnected") {
    // TODO help user find out why the stub function was disconnected. Maybe pull up
    //      CloudWatch logs for websocket server and the stub.
    clientLogger.error(
      chalk.grey(data.debugRequestId) +
        " Failed to send response because the Lambda function is disconnected"
    );
    return;
  }
  if (data.action === "server.failedToSendResponseDueToUnknown") {
    // TODO help user find out why the stub function was disconnected. Maybe pull up
    //      CloudWatch logs for websocket server and the stub.
    clientLogger.error(
      chalk.grey(data.debugRequestId) +
        " Failed to send response to the Lambda function"
    );
    return;
  }
  if (data.action !== "stub.lambdaRequest") {
    clientLogger.debug("Unkonwn websocket message received.");
    return;
  }

  const {
    stubConnectionId,
    event,
    context,
    env,
    debugRequestId,
    debugRequestTimeoutInMs,
    debugSrcPath,
    debugSrcHandler,
  } = data;

  // Print request info
  const eventSource = parseEventSource(event);
  const eventSourceDesc =
    eventSource === null
      ? " invoked"
      : ` invoked by ${chalk.cyan(eventSource)}`;
  clientLogger.info(
    chalk.grey(
      `${context.awsRequestId} REQUEST ${chalk.cyan(
        env.AWS_LAMBDA_FUNCTION_NAME
      )} [${debugSrcPath}/${debugSrcHandler}]${eventSourceDesc}`
    )
  );
  clientLogger.debug(chalk.grey(JSON.stringify(event)));

  // Get memory setting
  // From Lambda /var/runtime/bootstrap
  // https://link.medium.com/7ir11kKjwbb
  const newSpace = Math.floor(context.memoryLimitInMB / 10);
  const semiSpace = Math.floor(newSpace / 2);
  const oldSpace = context.memoryLimitInMB - newSpace;

  // Get timeout setting
  const timeoutAt = Date.now() + debugRequestTimeoutInMs;

  // Get transpiled handler
  let transpiledHandler;
  try {
    transpiledHandler = await getTranspiledHandler(
      debugSrcPath,
      debugSrcHandler
    );
  } catch (e) {
    clientLogger.error("Get transspiler handler error", e);
    // TODO: Handle esbuild transpilation error
    return;
  }

  // Invoke local function
  let lambdaResponse;
  const lambda = spawn(
    // The spawned command used to be just "node", and it caused `yarn start` to fail on Windows 10 with error:
    //    Error: EBADF: bad file descriptor, uv_pipe_open
    // The issue only happens when using spawn with ipc. It is find if "ipc" isnot used. According to this
    // GitHub issue - https://github.com/vercel/vercel/issues/3338, the cause is spawn cannot find "node".
    // Hence the fix is to specify the full path of the node executable.
    path.join(path.dirname(process.execPath), "node"),
    [
      `--max-old-space-size=${oldSpace}`,
      `--max-semi-space-size=${semiSpace}`,
      "--max-http-header-size=81920", // HTTP header limit of 8KB
      path.join(paths.ownPath, "assets", "lambda-invoke", "bootstrap.js"),
      JSON.stringify(event),
      JSON.stringify(context),
      timeoutAt,
      path.join(transpiledHandler.srcPath, transpiledHandler.entry),
      transpiledHandler.handler,
      transpiledHandler.origHandlerFullPosixPath,
    ],
    {
      stdio: ["inherit", "inherit", "inherit", "ipc"],
      cwd: paths.appPath,
      env: { ...process.env, ...env },
    }
  );

  // Start timeout timer
  const timer = setLambdaTimeoutTimer(lambda, handleResponse, timeoutAt);

  function parseEventSource(event) {
    try {
      // HTTP
      if (
        ["2.0", "1.0"].includes(event.version) &&
        event.requestContext.apiId
      ) {
        return event.version === "1.0"
          ? `API ${event.httpMethod} ${event.path}`
          : `API ${event.requestContext.http.method} ${event.rawPath}`;
      }

      // HTTP Authorizer
      if (["TOKEN", "REQUEST"].includes(event.type) && event.methodArn) {
        return "API authorizer";
      }

      if (event.Records && event.Records.length > 0) {
        // SNS
        if (event.Records[0].EventSource === "aws:sns") {
          // TopicArn: arn:aws:sns:us-east-1:123456789012:ExampleTopic
          const topics = array.unique(
            event.Records.map((record) => record.Sns.TopicArn.split(":").pop())
          );
          return topics.length === 1
            ? `SNS topic ${topics[0]}`
            : `SNS topics: ${topics.join(", ")}`;
        }
        // SQS
        if (event.Records.EventSource === "aws:sqs") {
          // eventSourceARN: arn:aws:sqs:us-east-1:123456789012:MyQueue
          const names = array.unique(
            event.Records.map((record) =>
              record.eventSourceARN.split(":").pop()
            )
          );
          return names.length === 1
            ? `SQS queue ${names[0]}`
            : `SQS queues: ${names.join(", ")}`;
        }
        // DynamoDB
        if (event.Records.EventSource === "aws:dynamodb") {
          return "DynamoDB";
        }
      }
    } catch (e) {
      clientLogger.debug(`Failed to parse event source ${e}`);
    }

    return null;
  }

  function handleResponse(response) {
    switch (response.type) {
      case "success":
      case "failure":
      case "timeout":
        lambdaResponse = response;
        break;
      default:
    }
  }

  function returnLambdaResponse() {
    // Handle timeout: do not send a response, let stub timeout
    if (lambdaResponse.type === "timeout") {
      clientLogger.info(
        chalk.grey(
          `${context.awsRequestId} ${chalk.red("ERROR")} Lambda timed out`
        )
      );
      return;
    }

    // handle success/failure
    if (lambdaResponse.type === "success") {
      clientLogger.info(
        chalk.grey(
          `${context.awsRequestId} RESPONSE ${JSON.stringify(
            lambdaResponse.data
          )}`
        )
      );
    } else if (lambdaResponse.type === "failure") {
      clientLogger.info(
        `${chalk.grey(context.awsRequestId)} ${chalk.red("ERROR")}`,
        deserializeError(lambdaResponse.error)
      );
    }
    clientState.ws.send(
      JSON.stringify({
        debugRequestId,
        stubConnectionId,
        action: "client.lambdaResponse",
        responseData: lambdaResponse.data,
        responseError: lambdaResponse.error,
      })
    );
  }

  lambda.on("message", handleResponse);
  lambda.on("exit", function () {
    returnLambdaResponse();
    clearTimeout(timer);
  });
}

function setLambdaTimeoutTimer(lambda, handleResponse, timeoutAt) {
  // Calculate ms left for the function execution. Do not use the
  // `debugRequestTimeoutInMs` value because time has passed since the
  // request was received (ie. time spent to spawn). If `debugRequestTimeoutInMs`
  // were used, calling getRemainingTimeInMillis() inside the function code
  // can return negative value.
  return setTimeout(function () {
    handleResponse({ type: "timeout" });

    try {
      process.kill(lambda.pid, "SIGKILL");
    } catch (e) {
      clientLogger.error("Cannot kill timed out Lambda", e);
    }
  }, timeoutAt - Date.now());
}
