"use strict";

const path = require("path");
const fs = require("fs-extra");
const chalk = require("chalk");
const WebSocket = require("ws");
const esbuild = require("esbuild");
const chokidar = require("chokidar");
const spawn = require("cross-spawn");
const allSettled = require("promise.allsettled");

const sstDeploy = require("./deploy");
const paths = require("./util/paths");
const {
  prepareCdk,
  applyConfig,
  deploy: cdkDeploy,
} = require("./util/cdkHelpers");
const array = require("../lib/array");
const { logger, addFileTransport } = require("../lib/logger");

// Setup logger
addFileTransport();
const clientLogger = logger.child({ label: "client" });
const builderLogger = logger.child({ label: "builder" });

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

const builderState = {
  isRebuilding: false,
  entryPointsData: {},
  srcPathsData: {},
  watchedFilesIndex: {},
};
const entryPointDataTemplateObject = {
  srcPath: null,
  handler: null,
  tsconfig: null,
  hasError: false,
  esbuilder: null,
  inputFiles: null,
  outHandler: null,
  transpilePromise: null,
  needsReTranspile: false,
  pendingRequestCallbacks: [],
};
const srcPathDataTemplateObject = {
  srcPath: null,
  tsconfig: null,
  inputFiles: null,
  lintProcess: null,
  typeCheckProcess: null,
  needsReCheck: false,
};

const clientState = {
  ws: null,
  wsKeepAliveTimer: null,
};

const MOCK_SLOW_ESBUILD_RETRANSPILE_IN_MS = 0;

process.on("uncaughtException", (err, origin) => {
  logger.info("===== Unhandled Exception at:", err, "origin:", origin);
});
process.on("unhandledRejection", (reason, promise) => {
  logger.info("===== Unhandled Rejection at:", promise, "reason:", reason);
});
process.on("rejectionHandled", (promise) => {
  logger.info("===== Rejection Handled at:", promise);
});

module.exports = async function (argv, cliInfo) {
  const config = await applyConfig(argv);

  // Deploy debug stack
  config.debugEndpoint = await deployDebugStack(cliInfo, config);

  // Deploy app
  await deployApp(argv, cliInfo, config);

  // Start client
  try {
    await startBuilder([
      { srcPath: "src/api", handler: "api.handler" },
      { srcPath: "src/sns", handler: "sns.handler" },
    ]);
  } catch (e) {
    return;
  }

  startClient(config.debugEndpoint);
};

async function deployDebugStack(cliInfo, config) {
  const stackName = `${config.stage}-debug-stack`;

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
  const debugStackRet = await cdkDeploy({
    ...cliInfo.cdkOptions,
    app: `node bin/index.js ${debugAppArgs.join(" ")}`,
    output: "cdk.out",
  });
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

  prepareCdk(argv, cliInfo, config);
  await sstDeploy(argv, config, cliInfo);
}

///////////////////////
// Builder functions //
///////////////////////

async function startBuilder(entryPoints) {
  builderLogger.info("");
  builderLogger.info("===================");
  builderLogger.info(" Starting debugger");
  builderLogger.info("===================");
  builderLogger.info("");

  initializeBuilderState(entryPoints);

  // Run transpiler
  builderLogger.info("Transpiling Lambda code...");

  esbuildService = await esbuild.startService();
  const results = await Promise.allSettled(
    entryPoints.map(({ srcPath, handler }) =>
      // Not catching esbuild errors
      // Letting it handle the error messages for now
      transpile(srcPath, handler)
    )
  );
  esbuildService.stop();

  const hasError = results.some((result) => result.status === "rejected");
  if (hasError) {
    Object.keys(builderState.entryPointsData).forEach((key) => {
      if (builderState.entryPointsData[key].esbuilder !== null) {
        builderState.entryPointsData[key].esbuilder.rebuild.dispose();
      }
    });
    throw new Error("Error transpiling");
  }

  // Validate transpiled
  const srcPaths = getAllSrcPaths();
  if (srcPaths.length === 0) {
    builderLogger.info("Nothing has been transpiled");
    return;
  }

  srcPaths.forEach((srcPath) => {
    const lintProcess = lint(srcPath);
    const typeCheckProcess = typeCheck(srcPath);
    onLintAndTypeCheckStarted({ srcPath, lintProcess, typeCheckProcess });
  });

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
async function updateBuilder() {
  builderLogger.silly(serializeState());

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
  Object.keys(srcPathsData).forEach((srcPath) => {
    let { lintProcess, typeCheckProcess, needsReCheck } = srcPathsData[srcPath];
    if (needsReCheck) {
      // stop existing linter & type checker
      lintProcess && lintProcess.kill();
      typeCheckProcess && typeCheckProcess.kill();

      // start new linter & type checker
      lintProcess = lint(srcPath);
      typeCheckProcess = typeCheck(srcPath);

      onLintAndTypeCheckStarted({ srcPath, lintProcess, typeCheckProcess });
    }
  });
}

async function onFileChange(ev, file) {
  builderLogger.debug(`File change: ${file}`);

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
  { tsconfig, esbuilder, outHandler, inputFiles }
) {
  const key = `${srcPath}/${handler}`;
  // Update entryPointsData
  builderState.entryPointsData[key] = {
    ...builderState.entryPointsData[key],
    tsconfig,
    esbuilder,
    outHandler,
    inputFiles,
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
  const key = `${srcPath}/${handler}`;

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
  const key = `${srcPath}/${handler}`;

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
  const key = `${srcPath}/${handler}`;

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
function onLintAndTypeCheckStarted({ srcPath, lintProcess, typeCheckProcess }) {
  // Update srcPath index
  builderState.srcPathsData[srcPath] = {
    ...builderState.srcPathsData[srcPath],
    lintProcess,
    typeCheckProcess,
    needsReCheck: false,
  };
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
  const metafile = getEsbuildMetafilePath(srcPath, handler);
  const outSrcPath = path.join(srcPath, paths.appBuildDir);

  const fullPath = await getHandlerFilePath(srcPath, handler);

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
    outdir: path.join(paths.appPath, outSrcPath),
  };

  builderLogger.debug(`Transpiling ${handler}...`);

  const esbuilder = await esbuild.build(esbuildOptions);

  return onTranspileSucceeded(srcPath, handler, {
    tsconfig,
    esbuilder,
    outHandler: {
      handler,
      srcPath: outSrcPath,
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

function lint(srcPath) {
  const { inputFiles } = builderState.srcPathsData[srcPath];

  const process = spawn(
    path.join(paths.appNodeModules, ".bin", "eslint"),
    [
      "--no-error-on-unmatched-pattern",
      "--config",
      path.join(paths.appBuildPath, ".eslintrc.internal.js"),
      path.join(paths.ownPath, "scripts", "util", ".eslintrc.internal.js"),
      "--ext",
      ".js,.ts",
      "--fix",
      // Handling nested ESLint projects in Yarn Workspaces
      // https://github.com/serverless-stack/serverless-stack/issues/11
      "--resolve-plugins-relative-to",
      ".",
      ...inputFiles,
    ],
    // TODO: Check if setting the cwd to the root is okay
    { stdio: "inherit", cwd: paths.appPath }
  );

  process.on("close", (code) => {
    builderLogger.debug(`linter exited with code ${code}`);
    onLintDone(srcPath);
  });

  return process;
}
function typeCheck(srcPath) {
  const { tsconfig, inputFiles } = builderState.srcPathsData[srcPath];
  const tsFiles = inputFiles.filter((file) => file.endsWith(".ts"));

  if (!tsconfig) {
    return null;
  }

  const process = spawn(
    path.join(paths.appNodeModules, ".bin", "tsc"),
    ["--noEmit", ...tsFiles],
    {
      stdio: "inherit",
      cwd: path.join(paths.appPath, srcPath),
    }
  );

  process.on("close", (code) => {
    builderLogger.debug(`type checker exited with code ${code}`);
    onTypeCheckDone(srcPath);
  });

  return process;
}

/////////////////////////////
// Builder State functions //
/////////////////////////////

function initializeBuilderState(entryPoints) {
  entryPoints.forEach(({ srcPath, handler }) => {
    const key = buildEntryPointKey(srcPath, handler);
    builderState.entryPointsData[key] = {
      ...entryPointDataTemplateObject,
      srcPath,
      handler,
    };
  });
}

function buildEntryPointKey(srcPath, handler) {
  return `${srcPath}/${handler}`;
}
function getAllWatchedFiles() {
  return Object.keys(builderState.watchedFilesIndex);
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

  const jsFile = path.join(paths.appPath, srcPath, `${name}.js`);

  if (await checkFileExists(jsFile)) {
    return jsFile;
  }

  const tsFile = path.join(paths.appPath, srcPath, `${name}.ts`);

  if (await checkFileExists(tsFile)) {
    return tsFile;
  }

  return jsFile;
}

async function getAllExternalsForHandler(srcPath) {
  let externals;

  try {
    const packageJson = JSON.parse(
      await fs.promises.readFile(path.join(srcPath, "package.json"), {
        encoding: "utf-8",
      })
    );
    externals = Object.keys({
      ...(packageJson.dependencies || {}),
      ...(packageJson.devDependencies || {}),
      ...(packageJson.peerDependencies || {}),
    });
  } catch (e) {
    builderLogger.debug(`No package.json found in ${srcPath}`);
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

  return entryPointData.outHandler;
}

function getEsbuildMetafilePath(srcPath, handler) {
  const key = `${srcPath}/${handler}`.replace(/[/.]/g, "-");
  const outSrcFullPath = path.join(paths.appPath, srcPath, paths.appBuildDir);

  return path.join(outSrcFullPath, `.esbuild.${key}.json`);
}

async function getInputFilesFromEsbuildMetafile(file) {
  let metaJson;

  try {
    metaJson = JSON.parse(
      await fs.promises.readFile(file, { encoding: "utf-8" })
    );
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
    clientLogger.error('WebSocket connection error', e);
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
      clientLogger.debug('Sending keep-alive call');
      clientState.ws.send(JSON.stringify({ action: 'client.keepAlive' }));
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
    clientLogger.debug('Unkonwn websocket message received.');
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
    debugSrcEntry,
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
      )} [${debugSrcPath}/${debugSrcEntry}:${debugSrcHandler}]${eventSourceDesc}`
    )
  );
  clientLogger.debug(chalk.grey(JSON.stringify(event)));

  // From Lambda /var/runtime/bootstrap
  // https://link.medium.com/7ir11kKjwbb
  const newSpace = Math.floor(context.memoryLimitInMB / 10);
  const semiSpace = Math.floor(newSpace / 2);
  const oldSpace = context.memoryLimitInMB - newSpace;

  let transpiledHandler;

  try {
    transpiledHandler = await getTranspiledHandler(
      // TODO: Add debugSrcEntry
      debugSrcPath,
      debugSrcHandler
    );
  } catch (e) {
    clientLogger.error("Get trasnspiler handler error", e);
    // TODO: Handle esbuild transpilation error
    return;
  }

  let lambdaResponse;
  const lambda = spawn(
    "node",
    [
      `--max-old-space-size=${oldSpace}`,
      `--max-semi-space-size=${semiSpace}`,
      "--max-http-header-size=81920", // HTTP header limit of 8KB
      path.join(paths.ownPath, "assets", "lambda-invoke", "bootstrap.js"),
      JSON.stringify(event),
      JSON.stringify(context),
      //"./src/index.js", // Local path to the Lambda functions
      transpiledHandler.srcPath,
      //"handler", // Function name of the handler function
      transpiledHandler.handler,
    ],
    {
      stdio: ["inherit", "inherit", "inherit", "ipc"],
      cwd: paths.appPath,
      env: { ...process.env, ...env },
    }
  );
  const timer = setLambdaTimeoutTimer(
    lambda,
    handleResponse,
    debugRequestTimeoutInMs
  );

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
      const errorMessage = lambdaResponse.error.message || lambdaResponse.error;
      clientLogger.info(lambdaResponse.error);
      clientLogger.error(chalk.grey(context.awsRequestId) + ` ${errorMessage}`);
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

function setLambdaTimeoutTimer(lambda, handleResponse, timeoutInMs) {
  return setTimeout(function () {
    handleResponse({ type: "timeout" });

    try {
      process.kill(lambda.pid, "SIGKILL");
    } catch (e) {
      clientLogger.error("Cannot kill timed out Lambda", e);
    }
  }, timeoutInMs);
}
