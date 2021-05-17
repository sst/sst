"use strict";

const os = require("os");
const zlib = require("zlib");
const path = require("path");
const AWS = require("aws-sdk");
const fs = require("fs-extra");
const chalk = require("chalk");
const WebSocket = require("ws");
const esbuild = require("esbuild");
const spawn = require("cross-spawn");
const {
  logger,
  getChildLogger,
  STACK_DEPLOY_STATUS,
} = require("@serverless-stack/core");
const s3 = new AWS.S3();

const paths = require("./util/paths");
const {
  sleep,
  synth,
  deploy,
  loadCache,
  updateCache,
  isGoRuntime,
  isNodeRuntime,
  isPythonRuntime,
  prepareCdk,
  getTsBinPath,
  checkFileExists,
  getEsbuildTarget,
  printDeployResults,
  generateStackChecksums,
  reTranspile: reTranpileCdk,
} = require("./util/cdkHelpers");
const array = require("../lib/array");
const Watcher = require("./util/Watcher");
const objectUtil = require("../lib/object");
const CdkWatcherState = require("./util/CdkWatcherState");
const LambdaWatcherState = require("./util/LambdaWatcherState");
const LambdaRuntimeServer = require("./util/LambdaRuntimeServer");
const { serializeError, deserializeError } = require("../lib/serializeError");

// Setup logger
const wsLogger = getChildLogger("websocket");
const clientLogger = getChildLogger("client");

const WEBSOCKET_CLOSE_CODE = {
  NEW_CLIENT_CONNECTED: 4901,
};
const MOCK_SLOW_ESBUILD_RETRANSPILE_IN_MS = 0;

let watcher;
let cdkWatcherState;
let lambdaWatcherState;
let esbuildService;
let lambdaServer;
let debugEndpoint;
let debugBucketArn;
let debugBucketName;

const clientState = {
  ws: null,
  wsKeepAliveTimer: null,
};

const IS_TEST = process.env.__TEST__ === "true";

module.exports = async function (argv, config, cliInfo) {
  // Load cache
  const cacheData = loadCache();

  // Deploy debug stack
  const debugStackOutputs = await deployDebugStack(argv, config, cliInfo, cacheData);
  debugEndpoint = debugStackOutputs.Endpoint;
  debugBucketArn = debugStackOutputs.BucketArn;
  debugBucketName = debugStackOutputs.BucketName;

  // Add input listener
  addInputListener();

  // Deploy app
  const cdkInputFiles = await deployApp(argv, config, cliInfo, cacheData);
  const lambdaHandlers = await getDeployedLambdaHandlers();

  logger.info("");
  logger.info("==========================");
  logger.info(" Starting Live Lambda Dev");
  logger.info("==========================");
  logger.info("");

  cdkWatcherState = new CdkWatcherState({
    inputFiles: cdkInputFiles,
    checksumData: cacheData.appStacks.checksumData,
    onReBuild: handleCdkReBuild,
    onLint: inputFiles => handleCdkLint(inputFiles, config),
    onTypeCheck: inputFiles => handleCdkTypeCheck(inputFiles, config),
    onSynth: () => handleCdkSynth(cliInfo),
    onReDeploy: ({ checksumData }) => handleCdkReDeploy(cliInfo, cacheData, checksumData),
    onAddWatchedFiles: handleAddWatchedFiles,
    onRemoveWatchedFiles: handleRemoveWatchedFiles,
  });

  lambdaWatcherState = new LambdaWatcherState({
    lambdaHandlers,
    onTranspileNode: handleTranspileNode,
    onRunLint: (srcPath, inputFiles) => handleRunLint(srcPath, inputFiles, config),
    onRunTypeCheck: (srcPath, inputFiles, tsconfig) => handleRunTypeCheck(srcPath, inputFiles, tsconfig, config),
    onCompileGo: handleCompileGo,
    onBuildPython: handleBuildPython,
    onAddWatchedFiles: handleAddWatchedFiles,
    onRemoveWatchedFiles: handleRemoveWatchedFiles,
  });
  await lambdaWatcherState.runInitialBuild(IS_TEST);

  // Save Lambda watcher state to file
  if (IS_TEST) {
    const testOutputPath = path.join(
      paths.appPath,
      paths.appBuildDir,
      "test-output.json"
    );
    fs.writeFileSync(testOutputPath, JSON.stringify(lambdaWatcherState.getState()));
  }

  // Start code watcher, Lambda runtime server, and websocket client
  await startWatcher();
  await startRuntimeServer(argv.port);
  startWebSocketClient();
};

async function deployDebugStack(argv, config, cliInfo, cacheData) {
  // Do not deploy if running test
  if (IS_TEST) {
    return {
      Endpoint: "ws://test-endpoint",
      BucketArn: "bucket-arn",
      BucketName: "bucket-name",
    };
  }

  logger.info("");
  logger.info("=======================");
  logger.info(" Deploying debug stack");
  logger.info("=======================");
  logger.info("");

  const stackName = `${config.stage}-${config.name}-debug-stack`;
  const cdkOptions = {
    ...cliInfo.cdkOptions,
    app: `node bin/index.js ${stackName} ${config.stage} ${config.region}`,
    output: "cdk.out",
  };

  // Change working directory
  // Note: When deploying the debug stack, the current working directory is user's app.
  //       Setting the current working directory to debug stack cdk app directory to allow
  //       Lambda Function construct be able to reference code with relative path.
  process.chdir(path.join(paths.ownPath, "assets", "debug-stack"));

  // Build
  const cdkManifest = await synth(cdkOptions);
  const cdkOutPath = path.join(paths.ownPath, "assets", "debug-stack", "cdk.out");
  const checksumData = generateStackChecksums(cdkManifest, cdkOutPath);

  // Deploy
  const isCacheChanged = checkCacheChanged(cacheData.debugStack, checksumData);
  const deployRet = isCacheChanged
    ? await deploy(cdkOptions)
    : cacheData.debugStack.deployRet;

  logger.debug("deployRet", deployRet);

  // Restore working directory
  process.chdir(paths.appPath);

  // Get WebSocket endpoint
  if (
    !deployRet ||
    deployRet.length !== 1 ||
    deployRet[0].status === STACK_DEPLOY_STATUS.FAILED
  ) {
    throw new Error(`Failed to deploy debug stack ${stackName}`);
  } else if (!deployRet[0].outputs || !deployRet[0].outputs.Endpoint) {
    throw new Error(
      `Failed to get the endpoint from the deployed debug stack ${stackName}`
    );
  }

  // Cache changed => Update cache
  if (isCacheChanged) {
    cacheData.debugStack = { checksumData, deployRet };
    updateCache(cacheData);
  }
  // Cache NOT changed => Print stack results since deploy was skipped
  else {
    printMockedDeployResults(deployRet);
  }

  return deployRet[0].outputs;
}
async function deployApp(argv, config, cliInfo, cacheData) {
  logger.info("");
  logger.info("===============");
  logger.info(" Deploying app");
  logger.info("===============");
  logger.info("");

  const { inputFiles } = await prepareCdk(argv, cliInfo, { ...config,
    debugEndpoint,
    debugBucketArn,
    debugBucketName,
  });

  // Build
  const cdkManifest = await synth(cliInfo.cdkOptions);
  const cdkOutPath = path.join(paths.appBuildPath, "cdk.out");
  const checksumData = generateStackChecksums(cdkManifest, cdkOutPath);

  if (IS_TEST) {
    cacheData.appStacks = {};
  }
  else {
    // Deploy
    const isCacheChanged = checkCacheChanged(cacheData.appStacks, checksumData);
    const deployRet = isCacheChanged
      ? await deploy(cliInfo.cdkOptions)
      : cacheData.appStacks.deployRet;

    // Check all stacks deployed successfully
    if (deployRet.some((stack) => stack.status === STACK_DEPLOY_STATUS.FAILED)) {
      throw new Error(`Failed to deploy the app`);
    }

    // Cache changed => Update cache
    if (isCacheChanged) {
      cacheData.appStacks = { checksumData, deployRet };
      updateCache(cacheData);
    }
    // Cache NOT changed => Print stack results since deploy was skipped
    else {
      // print a empty line before printing deploy results
      logger.info("");
      printMockedDeployResults(deployRet);
    }
  }

  return inputFiles;
}
async function startWatcher() {
  if (IS_TEST) { return; }

  // Watcher will build all the Lambda handlers on start and rebuild on code change
  watcher = new Watcher({
    cdkFiles: cdkWatcherState.getWatchedFiles(),
    lambdaFiles: lambdaWatcherState.getWatchedFiles(),
    onFileChange: file => {
      cdkWatcherState.handleFileChange(file);
      lambdaWatcherState.handleFileChange(file);
    },
  });
}
async function startRuntimeServer(port) {
  if (IS_TEST) { return; }

  // note: 0.0.0.0 does not work on Windows
  lambdaServer = new LambdaRuntimeServer();
  await lambdaServer.start("127.0.0.1", port);
}
function addInputListener() {
  if (IS_TEST) { return; }

  process.stdin.on("data", () => {
    cdkWatcherState && cdkWatcherState.handleInput();
  });

  process.on('SIGINT', function() {
    console.log(chalk.yellow("\nStopping Live Lambda Dev, run `sst deploy` to deploy the latest changes."));
    process.exit(0);
  });

  // Note: the "readline" way of listening for each keystroke did not play well
  //       with the "prompts" modules, as the "prompts" module closes the rl
  //       interface. For now, we will listen for the SIGINT event above.

  //const rl = readline.createInterface({
  //  input: process.stdin,
  //  output: process.stdout
  //});
  //process.stdin.on('keypress', async (c, k) => {
  //  //console.log("keypress", JSON.stringify({ c, k }));
  //  if (!k) { return; }

  //  // CTRL+c or CTRL+d
  //  if ((k.name === "c" || k.name === "d") && k.ctrl === true) {
  //    console.log(chalk.yellow("\nStopping Live Lambda Dev, run `sst deploy` to deploy the latest changes.\n"));
  //    process.exit(0);
  //  }
  //  else if (k.name === "enter") {
  //    cdkWatcherState && cdkWatcherState.handleInput();
  //  }
  //});
}

////////////////////////////
// CDK Reloader functions //
////////////////////////////

async function handleCdkReBuild() {
  try {
    const inputFiles = await reTranpileCdk();
    cdkWatcherState.handleReBuildSucceeded({ inputFiles });
  } catch (e) {
    cdkWatcherState.handleReBuildFailed(e);
  }
}
function handleCdkLint(inputFiles, config) {
  // Validate lint enabled
  if (!config.lint) {
    return null;
  }

  inputFiles = inputFiles.filter(
    (file) =>
      file.indexOf("node_modules") === -1 &&
      (file.endsWith(".ts") || file.endsWith(".js"))
  );

  // Validate inputFiles
  if (inputFiles.length === 0) {
    return null;
  }

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
    cdkWatcherState.handleLintDone({ cp, code });
  });

  return cp;
}
function handleCdkTypeCheck(inputFiles, config) {
  // Validate typeCheck enabled
  if (!config.typeCheck) {
    return null;
  }

  const tsFiles = inputFiles.filter((file) => file.endsWith(".ts"));

  // Validate tsFiles
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
      cwd: paths.appPath,
    }
  );

  cp.on("close", (code) => {
    cdkWatcherState.handleTypeCheckDone({ cp, code });
  });

  return cp;
}
function handleCdkSynth(cliInfo) {
  const synthPromise = synth(cliInfo.cdkOptions);
  synthPromise
    .then((cdkManifest) => {
      const cdkOutPath = path.join(paths.appBuildPath, "cdk.out");
      const checksumData = generateStackChecksums(cdkManifest, cdkOutPath);
      cdkWatcherState.handleSynthDone({ hasError: false, checksumData });
    })
    .catch(e => {
      cdkWatcherState.handleSynthDone({ hasError: true, isCancelled: e.cancelled });
    });
  return synthPromise;
}
async function handleCdkReDeploy(cliInfo, cacheData, checksumData) {
  try {
    // While deploying, synth might run again if another change is made. That
    // can cause the value of 'lastSynthedChecksumData' to change. So we need
    // to clone the value.
    checksumData = { ...checksumData };

    const deployRet = await deploy(cliInfo.cdkOptions);
    if (deployRet.some((stack) => stack.status === STACK_DEPLOY_STATUS.FAILED)) {
      // Throw a dummy error. Watcher just need to catch something and prints
      // out that redeploy failed. Do not need to throw with an error message
      // b/c deploy status is printed out onto the terminal.
      throw null;
    }

    // Update Lambda state
    const lambdaHandlers = await getDeployedLambdaHandlers();
    lambdaWatcherState.handleUpdateLambdaHandlers(lambdaHandlers);

    // Update cache
    cacheData.appStacks = { checksumData, deployRet };
    updateCache(cacheData);

    cdkWatcherState.handleReDeployDone({ hasError: false });
  } catch(e) {
    cdkWatcherState.handleReDeployDone({ hasError: true });
  }
}
function handleAddWatchedFiles(files) {
  if (files.length > 0) {
    watcher.addFiles(files);
  }
}
async function handleRemoveWatchedFiles(files) {
  if (files.length > 0) {
    await watcher.removeFiles(files);
  }
}

////////////////////////////////////////
// Lambda Reloader functions - NodeJS //
////////////////////////////////////////

async function handleTranspileNode({ srcPath, handler, bundle, esbuilder, onSuccess, onFailure }) {
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

  try {
    const metafile = getEsbuildMetafilePath(paths.appPath, srcPath, handler);
    const fullPath = await getHandlerFilePath(paths.appPath, srcPath, handler);
    const outSrcPath = path.join(
      srcPath,
      paths.appBuildDir,
      path.dirname(handler)
    );
    const handlerParts = path.basename(handler).split(".");
    const outHandler = handlerParts.pop();
    const outEntry = `${handlerParts.join(".")}.js`;

    // Get tsconfig
    const tsconfigPath = path.join(paths.appPath, srcPath, "tsconfig.json");
    const isTs = await checkFileExists(tsconfigPath);
    const tsconfig = isTs ? tsconfigPath : undefined;

    // Transpile
    esbuilder = esbuilder
      ? await runReTranspileNode(esbuilder)
      : await runTranspileNode(srcPath, handler, bundle, metafile, tsconfig, fullPath, outSrcPath);

    onSuccess({
      tsconfig,
      esbuilder,
      outEntryPoint: {
        entry: outEntry,
        handler: outHandler,
        srcPath: outSrcPath,
        origHandlerFullPosixPath: getHandlerFullPosixPath(srcPath, handler),
      },
      inputFiles: await getInputFilesFromEsbuildMetafile(metafile),
    });
  } catch(e) {
    logger.debug("handleTranspileNode error", e);
    onFailure(e);
  }
}
async function runTranspileNode(srcPath, handler, bundle, metafile, tsconfig, fullPath, outSrcPath) {
  logger.debug(`Transpiling ${handler}...`);

  // Start esbuild service is has not started
  if (!esbuildService) {
    esbuildService = await esbuild.startService();
  }
  return await esbuildService.build({
    external: await getEsbuildExternal(srcPath),
    loader: getEsbuildLoader(bundle),
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
    logLevel: process.env.DEBUG ? "warning" : "error",
  });
}
async function runReTranspileNode(esbuilder) {
  await esbuilder.rebuild();

  // Mock esbuild taking long to rebuild
  if (MOCK_SLOW_ESBUILD_RETRANSPILE_IN_MS) {
    logger.debug(
      `Mock rebuild wait (${MOCK_SLOW_ESBUILD_RETRANSPILE_IN_MS}ms)...`
    );
    await sleep(MOCK_SLOW_ESBUILD_RETRANSPILE_IN_MS);
    logger.debug(`Mock rebuild wait done`);
  }
  return esbuilder;
}
function handleRunLint(srcPath, inputFiles, config) {
  // Validate lint enabled
  if (!config.lint) {
    return null;
  }

  inputFiles = inputFiles.filter(
    (file) =>
      file.indexOf("node_modules") === -1 &&
      (file.endsWith(".ts") || file.endsWith(".js"))
  );

  // Validate inputFiles
  if (inputFiles.length === 0) {
    return null;
  }

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
    logger.debug(`linter exited with code ${code}`);
    lambdaWatcherState.handleLintDone(srcPath);
  });

  return cp;
}
function handleRunTypeCheck(srcPath, inputFiles, tsconfig, config) {
  // Validate typeCheck enabled
  if (!config.typeCheck) {
    return null;
  }

  const tsFiles = inputFiles.filter((file) => file.endsWith(".ts"));

  // Validate tsFiles
  if (tsFiles.length === 0) {
    return null;
  }

  if (tsconfig === undefined) {
    logger.error(
      `Cannot find a "tsconfig.json" in the function's srcPath: ${path.resolve(
        srcPath
      )}`
    );
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
    logger.debug(`type checker exited with code ${code}`);
    lambdaWatcherState.handleTypeCheckDone(srcPath);
  });

  return cp;
}

async function getHandlerFilePath(appPath, srcPath, handler) {
  const parts = handler.split(".");
  const name = parts[0];

  const tsFile = path.join(appPath, srcPath, `${name}.ts`);
  if (await checkFileExists(tsFile)) {
    return tsFile;
  }

  return path.join(appPath, srcPath, `${name}.js`);
}
async function getEsbuildExternal(srcPath) {
  let externals;

  try {
    const packageJson = await fs.readJson(path.join(srcPath, "package.json"));
    externals = Object.keys({
      ...(packageJson.dependencies || {}),
      ...(packageJson.devDependencies || {}),
      ...(packageJson.peerDependencies || {}),
    });
  } catch (e) {
    logger.warn(`No package.json found in ${srcPath}`);
    externals = [];
  }

  return externals;
}
function getEsbuildLoader(bundle) {
  if (bundle) {
    return bundle.loader || {};
  }
  return undefined;
}
function getEsbuildMetafilePath(appPath, srcPath, handler) {
  const key = `${srcPath}/${handler}`.replace(/[/.]/g, "-");
  const outSrcFullPath = path.join(appPath, srcPath, paths.appBuildDir);

  return path.join(outSrcFullPath, `.esbuild.${key}.json`);
}
async function getInputFilesFromEsbuildMetafile(file) {
  let metaJson;

  try {
    metaJson = await fs.readJson(file);
  } catch (e) {
    logger.error("There was a problem reading the build metafile", e);
  }

  return Object.keys(metaJson.inputs).map((input) => path.resolve(input));
}

////////////////////////////////////
// Lambda Reloader functions - Go //
////////////////////////////////////

async function handleCompileGo({ srcPath, handler, onSuccess, onFailure }) {
  try {
    const { outEntry } = await runCompile(srcPath, handler);
    onSuccess({
      outEntryPoint: {
        entry: outEntry,
        origHandlerFullPosixPath: getHandlerFullPosixPath(srcPath, handler),
      },
      inputFiles: [],
    });
  } catch(e) {
    logger.debug("handleCompileGo error", e);
    onFailure(e);
  }
}
function runCompile(srcPath, handler) {
  // Sample input:
  //  srcPath     'services/user-service'
  //  handler     'src/lambda.go'
  //
  // Sample output path:
  //  absHandlerPath    'services/user-service/src/lambda.go'
  //  relBinPath        -> if handler is 'src/lambda.go' => '.build/src/lambda'
  //                    -> if handler is 'src' => '.build/src/main'
  //  binPath           'services/user-service/.build/src/lambda'
  //
  // Transpiled Go executables are output in .build folder with original handler structure path

  const absSrcPath = path.join(paths.appPath, srcPath);
  const absHandlerPath = path.join(paths.appPath, srcPath, handler);
  let relBinPath;
  if (handler.endsWith(".go")) {
    relBinPath = path.join(
      paths.appBuildDir,
      path.dirname(handler),
      path.basename(handler).slice(0, -3)
    );
  }
  else {
    relBinPath = path.join(paths.appBuildDir, handler, "main");
  }

  // Append ".exe" for Windows
  if (process.platform === 'win32') {
    relBinPath = `${relBinPath}.exe`;
  }

  logger.debug(`Building ${absHandlerPath}...`);

  return new Promise((resolve, reject) => {
    const cp = spawn(
      "go",
      [
        "build",
        "-ldflags",
        "-s -w",
        "-o",
        relBinPath,
        // specify absolute path b/c if "handler" can be a folder, and a relative path does not work
        absHandlerPath,
      ],
      {
        stdio: "inherit",
        env: {
          ...process.env,
          // Compile for local runtime b/c the go executable will be run locally
          //GOOS: "linux",
        },
        cwd: absSrcPath,
      }
    );

    cp.on("error", (e) => {
      logger.debug("go build error", e);
    });

    cp.on("close", (code) => {
      logger.debug(`go build exited with code ${code}`);
      if (code !== 0) {
        reject(new Error(`There was an problem compiling the handler at "${absHandlerPath}".`));
      }
      else {
        resolve({
          outEntry: path.join(absSrcPath, relBinPath),
        });
      }
    });
  });
}

////////////////////////////////////////
// Lambda Reloader functions - Python //
////////////////////////////////////////

function handleBuildPython({ srcPath, handler, onSuccess }) {
  // ie.
  //  handler     src/lambda.main
  //  outHandler  main
  //  outEntry    src/lambda
  const handlerParts = handler.split(".");
  const outHandler = handlerParts.pop();
  const outEntry = handlerParts.join(".");

  Promise.resolve('success').then(() => onSuccess({
    outEntryPoint: {
      entry: outEntry,
      handler: outHandler,
      srcPath,
      origHandlerFullPosixPath: getHandlerFullPosixPath(srcPath, handler),
    },
    inputFiles: [],
  }));
}

////////////////////
// Util functions //
////////////////////

async function getDeployedLambdaHandlers() {
  // Load Lambda handlers
  // ie. { srcPath: "src/api", handler: "api.main", runtime: "nodejs12.x", bundle: {} },
  const lambdaHandlersPath = path.join(
    paths.appPath,
    paths.appBuildDir,
    "lambda-handlers.json"
  );

  if (!(await checkFileExists(lambdaHandlersPath))) {
    throw new Error(`Failed to get the Lambda handlers info from the app`);
  }

  return await fs.readJson(lambdaHandlersPath);
}
function checkCacheChanged(cacheDatum, checksumData) {
  if (!cacheDatum
    || !cacheDatum.checksumData
    || !cacheDatum.deployRet) {
    return true;
  }

  return Object.keys(checksumData).some(name =>
    checksumData[name] !== cacheDatum.checksumData[name]
  );
}
function printMockedDeployResults(deployRet) {
  deployRet.forEach(per => {
    per.status = STACK_DEPLOY_STATUS.UNCHANGED;
    logger.info(chalk.green(` ✅  ${per.name} (no changes)`));
  });
  printDeployResults(deployRet);
}

///////////////////////////////
// Websocke Client functions //
///////////////////////////////

function startWebSocketClient() {
  if (IS_TEST) { return; }

  wsLogger.debug("startWebSocketClient", debugEndpoint, debugBucketName);

  clientState.ws = new WebSocket(debugEndpoint);

  clientState.ws.on("open", () => {
    wsLogger.debug("WebSocket connection opened");
    clientState.ws.send(JSON.stringify({ action: "client.register" }));
    startKeepAliveMonitor();
  });

  clientState.ws.on("close", (code, reason) => {
    wsLogger.debug("Websocket connection closed", { code, reason });

    // Case: disconnected due to new client connected => do not reconnect
    if (code === WEBSOCKET_CLOSE_CODE.NEW_CLIENT_CONNECTED) {
      wsLogger.debug("Websocket connection closed due to new client connected");
      return;
    }

    // Case: disconnected due to 10min idle or 2hr WebSocket connection limit => reconnect
    wsLogger.debug("Reconnecting to websocket server...");
    startWebSocketClient();
  });

  clientState.ws.on("error", (e) => {
    wsLogger.error("WebSocket connection error", e);
  });

  clientState.ws.on("message", onClientMessage);
}

function startKeepAliveMonitor() {
  wsLogger.debug("startKeepAliveMonitor");

  // Cancel existing keep-alive timer
  if (clientState.wsKeepAliveTimer) {
    clearTimeout(clientState.wsKeepAliveTimer);
    wsLogger.debug("Old keep-alive timer cleared");
  }

  // Create keep-alive timer
  wsLogger.debug("Creating new keep-alive timer...");
  clientState.ws.send(JSON.stringify({ action: "client.heartbeat" }));
  clientState.wsKeepAliveTimer = setInterval(() => {
    if (clientState.ws) {
      wsLogger.debug("Sending keep-alive call");
      clientState.ws.send(JSON.stringify({ action: "client.keepAlive" }));
    }
  }, 60000);
}

async function onClientMessage(message) {
  clientLogger.debug("onClientMessage", message);

  const data = JSON.parse(message);
  let lambdaResponse;

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

  // Parse payload
  const {
    stubConnectionId,
    debugRequestId,
    payload,
    payloadS3Key,
  } = data;
  let payloadData;
  if (payload) {
    clientLogger.debug("Fetching payload inline");
    payloadData = Buffer.from(payload, "base64");
  }
  else {
    clientLogger.debug("Fetching payload from S3");
    const s3Ret = await s3.getObject({
      Bucket: debugBucketName,
      Key: payloadS3Key,
    }).promise();
    payloadData = s3Ret.Body;
  }

  // Unzip payload
  clientLogger.debug("Unzipping payload");
  const {
    event,
    context,
    env,
    debugRequestTimeoutInMs,
    debugSrcPath,
    debugSrcHandler,
  } = JSON.parse(zlib.unzipSync(payloadData).toString());

  // Print request info
  clientLogger.debug("Parsing event source");
  const eventSource = parseEventSource(event);
  const eventSourceDesc =
    eventSource === null
      ? " invoked"
      : ` invoked by ${eventSource}`;
  clientLogger.info(
    chalk.grey(
      `${context.awsRequestId} REQUEST ${env.AWS_LAMBDA_FUNCTION_NAME} [${debugSrcPath}/${debugSrcHandler}]${eventSourceDesc}`
    )
  );
  clientLogger.debug("Lambda event", JSON.stringify(event));

  // Get memory setting
  // From Lambda /var/runtime/bootstrap
  // https://link.medium.com/7ir11kKjwbb
  const newSpace = Math.floor(context.memoryLimitInMB / 10);
  const semiSpace = Math.floor(newSpace / 2);
  const oldSpace = context.memoryLimitInMB - newSpace;
  clientLogger.debug("Lambda memory settings", {
    newSpace,
    semiSpace,
    oldSpace,
  });

  // Get timeout setting
  const timeoutAt = Date.now() + debugRequestTimeoutInMs;
  clientLogger.debug("Lambda timeout settings", { timeoutAt });

  // Get transpiled handler
  let runtime;
  let transpiledHandler;
  try {
    const ret = await lambdaWatcherState.getTranspiledHandler(
      debugSrcPath,
      debugSrcHandler
    );
    runtime = ret.runtime;
    transpiledHandler = ret.handler;
    clientLogger.debug("Transpiled handler", { debugSrcPath, debugSrcHandler });
  } catch (e) {
    // print the error as a string without the stacktrace
    clientLogger.debug(e);

    // set the error response, we don't have to format the error b/c it's an SST build error,
    // and not meaningful to user
    handleResponse({ type: "failure", error: serializeError(e) });

    // print error
    clientLogger.info(
      chalk.grey(
        `${context.awsRequestId} ${chalk.red("ERROR")} ${e.message}`
      )
    );

    // send Lambda response
    sendLambdaResponse();

    return;
  }

  // Add request to RUNTIME server
  clientLogger.debug("Adding request to RUNTIME server...");
  lambdaServer.addRequest({
    debugRequestId,
    timeoutAt,
    event,
    context,
    onSuccess: (data) => {
      clientLogger.trace("onSuccess", data);
      handleResponse({ type: "success", data });

      // Stop Lambda process
      process.kill(lambda.pid, "SIGKILL");
    },
    onFailure: (data) => {
      clientLogger.trace("onFailure", data);

      // Transform error to Node error b/c the stub Lambda is in Node
      const error = new Error();
      error.name = data.errorType;
      error.message = data.errorMessage;
      delete error.stack;
      handleResponse({ type: "failure", error: serializeError(error), rawError: data });

      // Stop Lambda process
      process.kill(lambda.pid, "SIGKILL");
    }
  });

  // Invoke local function
  clientLogger.debug("Invoking local function...");
  let lambdaLastStdData;
  let lambda;
  if (isNodeRuntime(runtime)) {
    lambda = spawn(
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
        path.join(paths.ownPath, "scripts", "util", "bootstrap.js"),
        path.join(transpiledHandler.srcPath, transpiledHandler.entry),
        transpiledHandler.handler,
        transpiledHandler.origHandlerFullPosixPath,
        paths.appBuildDir,
      ],
      {
        stdio: ["inherit", "inherit", "inherit", "ipc"],
        cwd: paths.appPath,
        env: {
          ...process.env,
          ...env,
          IS_LOCAL: true,
          AWS_LAMBDA_RUNTIME_API: `${lambdaServer.host}:${lambdaServer.port}/${debugRequestId}`,
        },
      }
    );
    lambda.on("message", handleResponse);
  }
  else if (isPythonRuntime(runtime)) {
    // Handle VIRTUAL_ENV
    let PATH = process.env.PATH;
    if (process.env.VIRTUAL_ENV) {
      const runtimeDir = os.platform() === 'win32' ? 'Scripts' : 'bin';
      PATH = [
        path.join(process.env.VIRTUAL_ENV, runtimeDir),
        path.delimiter,
        PATH,
      ].join('');
    }

    // Spawn function
    const pythonCmd = os.platform() === 'win32' ? 'python.exe' : runtime.split('.')[0];
    lambda = spawn(
      pythonCmd,
      [
        '-u',
        path.join(paths.ownPath, "scripts", "util", "bootstrap.py"),
        path.join(transpiledHandler.srcPath, transpiledHandler.entry).split(path.sep).join('.'),
        transpiledHandler.handler,
      ],
      {
        stdio: "pipe",
        cwd: paths.appPath,
        env: {
          ...process.env,
          ...env,
          PATH,
          IS_LOCAL: true,
          AWS_LAMBDA_RUNTIME_API: `${lambdaServer.host}:${lambdaServer.port}/${debugRequestId}`,
        },
      }
    );
  }
  else if (isGoRuntime(runtime)) {
    lambda = spawn(
      transpiledHandler.entry,
      [],
      {
        stdio: "pipe",
        cwd: paths.appPath,
        env: {
          ...process.env,
          ...env,
          IS_LOCAL: true,
          AWS_LAMBDA_RUNTIME_API: `${lambdaServer.host}:${lambdaServer.port}/${debugRequestId}`,
        },
      }
    );
  }

  // For non-Node runtimes, stdio is set to 'pipe', need to print out the output
  if (!isNodeRuntime(runtime)) {
    lambda.stdout.on("data", (data) => {
      data = data.toString();
      clientLogger.trace(data);
      lambdaLastStdData = data;
      process.stdout.write(data);
    });
    lambda.stderr.on("data", (data) => {
      data = data.toString();
      clientLogger.trace(data);
      lambdaLastStdData = data;
      process.stderr.write(data);
    });
  }

  lambda.on("error", function (e) {
    clientLogger.debug("Failed to run local function", e);
  });
  lambda.on("exit", function (code) {
    clientLogger.debug("Lambda exited", code);

    lambdaServer.removeRequest(debugRequestId);

    // Did not receive a response. Most likely the user's handler code
    // called process.exit. This is the case with running Express inside
    // Lambda.
    if (!lambdaResponse) {
      handleResponse({ type: "exit", code });
    }

    // If the last stdout or stderr does not end with a new line character,
    // ie. fmt("message") in Go does not end with a new line
    // We need to print a new line
    if (lambdaLastStdData && !lambdaLastStdData.endsWith('\n')) {
      console.log('');
    }

    printLambdaResponse();
    sendLambdaResponse();
    clearTimeout(timer);
  });

  // Start timeout timer
  const timer = startLambdaTimeoutTimer(lambda, handleResponse, timeoutAt);
  clientLogger.debug("Lambda timeout timer started");

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
      clientLogger.debug("Failed to parse event source", e);
    }

    return null;
  }

  function handleResponse(response) {
    clientLogger.debug("Lambda response received", response);

    switch (response.type) {
      case "success":
      case "failure":
      case "timeout":
      case "exit":
        lambdaResponse = response;
        break;
      default:
    }
  }

  function printLambdaResponse() {
    if (lambdaResponse.type === "timeout") {
      clientLogger.info(
        chalk.grey(
          `${context.awsRequestId} ${chalk.red("ERROR")} Lambda timed out`
        )
      );
    }
    else if (lambdaResponse.type === "success") {
      clientLogger.info(
        chalk.grey(
          `${context.awsRequestId} RESPONSE ${objectUtil.truncate(lambdaResponse, {
            totalLength: 1500,
            arrayLength: 10,
            stringLength: 100,
          })}`
        )
      );
    } else if (lambdaResponse.type === "failure") {
      let errorMessage;
      if (isNodeRuntime(runtime)) {
        // NodeJS: print deserialized error
        errorMessage = deserializeError(lambdaResponse.error);
      }
      else if (isGoRuntime(runtime) || isPythonRuntime(runtime)) {
        // Print rawError b/c error has been converted to a NodeJS error object.
        // We will remove this hack after we create a stub in native runtime.
        errorMessage = lambdaResponse.rawError;
      }
      clientLogger.info(
        `${chalk.grey(context.awsRequestId)} ${chalk.red("ERROR")}`,
        errorMessage
      );
    } else if (lambdaResponse.type === "exit") {
      const message =
        lambdaResponse.code === 0
          ? "Runtime exited without providing a reason"
          : `Runtime exited with error: exit status ${lambdaResponse.code}`;
      clientLogger.info(
        `${chalk.grey(context.awsRequestId)} ${chalk.red("ERROR")}`,
        message
      );
    }
  }

  function sendLambdaResponse() {
    // Do not send a response for timeout, let stub timeout
    if (lambdaResponse.type === "timeout") {
      return;
    }

    // Zipping payload
    const payload = zlib.gzipSync(JSON.stringify({
      responseData: lambdaResponse.data,
      responseError: lambdaResponse.error,
      responseExitCode: lambdaResponse.code,
    }));
    const payloadBase64 = payload.toString("base64");
    // payload fits into 1 WebSocket frame (limit is 32KB)
    if (payloadBase64.length < 32000) {
      clientLogger.debug(`Sending payload via WebSocket`);
      clientState.ws.send(JSON.stringify({
        action: "client.lambdaResponse",
        debugRequestId,
        stubConnectionId,
        payload: payloadBase64,
      }));
    }
    // payload does NOT fit into 1 WebSocket frame
    else {
      clientLogger.debug(`Sending payload via S3`);
      const s3Params = {
        Bucket: debugBucketName,
        Key: `payloads/${debugRequestId}-response`,
        Body: payload,
      };
      s3.upload(s3Params, (e) => {
        if (e) {
          clientLogger.error("Failed to upload payload to S3.", e);
        }

        clientLogger.debug(`Sending payloadS3Key via WebSocket`);
        clientState.ws.send(JSON.stringify({
          action: "client.lambdaResponse",
          debugRequestId,
          stubConnectionId,
          payloadS3Key: s3Params.Key,
        }));
      });
    }
  }
}

function startLambdaTimeoutTimer(lambda, handleResponse, timeoutAt) {
  clientLogger.debug("Called");

  // Calculate ms left for the function execution. Do not use the
  // `debugRequestTimeoutInMs` value because time has passed since the
  // request was received (ie. time spent to spawn). If `debugRequestTimeoutInMs`
  // were used, calling getRemainingTimeInMillis() inside the function code
  // can return negative value.
  return setTimeout(function () {
    handleResponse({ type: "timeout" });

    try {
      clientLogger.debug("Killing timed out Lambda function");
      process.kill(lambda.pid, "SIGKILL");
    } catch (e) {
      clientLogger.error("Failed to kill timed out Lambda", e);
    }
  }, timeoutAt - Date.now());
}
function getHandlerFullPosixPath(srcPath, handler) {
  return srcPath === "." ? handler : `${srcPath}/${handler}`;
}
