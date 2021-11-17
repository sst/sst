"use strict";

const zlib = require("zlib");
const path = require("path");
const util = require("util");
const AWS = require("aws-sdk");
const fs = require("fs-extra");
const chalk = require("chalk");
const WebSocket = require("ws");
const crypto = require("crypto");
const esbuild = require("esbuild");
const spawn = require("cross-spawn");
const detect = require("detect-port-alt");
const {
  logger,
  getChildLogger,
  STACK_DEPLOY_STATUS,
  Runtime,
  Bridge,
} = require("@serverless-stack/core");
const s3 = new AWS.S3();

const paths = require("./util/paths");
const {
  sleep,
  synth,
  deploy,
  prepareCdk,
  writeConfig,
  getTsBinPath,
  checkFileExists,
  getEsbuildTarget,
  writeOutputsFile,
  loadEsbuildConfigOverrides,
  reTranspile: reTranpileCdk,
} = require("./util/cdkHelpers");
const array = require("../lib/array");
const Watcher = require("./util/Watcher");
const objectUtil = require("../lib/object");
const ApiServer = require("./util/ApiServer");
const ConstructsState = require("./util/ConstructsState");
const CdkWatcherState = require("./util/CdkWatcherState");
const LambdaWatcherState = require("./util/LambdaWatcherState");
const { serializeError } = require("../lib/serializeError");

const RUNTIME_SERVER_PORT = 12557;
const API_SERVER_PORT = 4000;
const WEBSOCKET_CLOSE_CODE = {
  NEW_CLIENT_CONNECTED: 4901,
};
const MOCK_SLOW_ESBUILD_RETRANSPILE_IN_MS = 0;

let watcher;
let constructsState;
let cdkWatcherState;
let lambdaWatcherState;
let esbuildService;
let server;
let apiServer;
let debugEndpoint;
let debugBucketArn;
let debugBucketName;
let isConsoleEnabled = false;
// This flag is currently used by the "sst.Script" construct to make the "BuiltAt"
// remain the same when rebuilding infrastructure.
const debugStartedAt = Date.now();

const clientState = {
  ws: null,
  wsKeepAliveTimer: null,
};

const IS_TEST = process.env.__TEST__ === "true";

// Setup logger
const wsLogger = getChildLogger("websocket");
const clientLogger = {
  debug: (...m) => {
    getChildLogger("client").debug(...m);
  },
  trace: (...m) => {
    // If console is not enabled, print trace in terminal (ie. request logs)
    isConsoleEnabled
      ? getChildLogger("client").trace(...m)
      : getChildLogger("client").info(...m);
    forwardToBrowser(...m);
  },
  info: (...m) => {
    getChildLogger("client").info(...m);
    forwardToBrowser(...m);
  },
  warn: (...m) => {
    getChildLogger("client").warn(...m);
    forwardToBrowser(...m);
  },
  error: (...m) => {
    getChildLogger("client").error(...m);
    forwardToBrowser(...m);
  },
};

module.exports = async function (argv, config, cliInfo) {
  const { inputFiles: cdkInputFiles, lintOutput: cdkLintOutput } =
    await prepareCdk(argv, cliInfo, config);

  // Deploy debug stack
  const debugStackOutputs = await deployDebugStack(argv, config, cliInfo);
  debugEndpoint = debugStackOutputs.Endpoint;
  debugBucketArn = debugStackOutputs.BucketArn;
  debugBucketName = debugStackOutputs.BucketName;

  // Add input listener
  addInputListener();

  // Deploy app
  const { deployRet: appStackDeployRet, checksumData } = await deployApp(
    argv,
    config,
    cliInfo
  );
  const lambdaHandlers = await getDeployedLambdaHandlers();
  const constructs = await getDeployedConstructs();
  await updateStaticSiteEnvironmentOutputs(appStackDeployRet);

  logger.info("");
  logger.info("==========================");
  logger.info(" Starting Live Lambda Dev");
  logger.info("==========================");
  logger.info("");

  constructsState = new ConstructsState({
    region: config.region,
    stage: config.stage,
    constructs,
    onConstructsUpdated: () => {
      if (constructsState) {
        apiServer &&
          apiServer.publish("CONSTRUCTS_UPDATED", {
            constructsUpdated: constructsState.listConstructs(),
          });
      }
    },
  });

  cdkWatcherState = new CdkWatcherState({
    inputFiles: cdkInputFiles,
    initialLintOutput: cdkLintOutput,
    initialChecksumData: checksumData,
    onReBuild: handleCdkReBuild,
    onLint: (inputFiles) => handleCdkLint(inputFiles, config),
    onTypeCheck: (inputFiles) => handleCdkTypeCheck(inputFiles, config),
    onSynth: () => handleCdkSynth(cliInfo),
    onReDeploy: () => handleCdkReDeploy(cliInfo),
    onAddWatchedFiles: handleAddWatchedFiles,
    onRemoveWatchedFiles: handleRemoveWatchedFiles,
    onStatusUpdated: (status) => {
      apiServer &&
        apiServer.publish("INFRA_STATUS_UPDATED", {
          infraStatusUpdated: status,
        });
    },
  });

  lambdaWatcherState = new LambdaWatcherState({
    lambdaHandlers,
    onTranspileNode: (entrypointData) =>
      handleTranspileNode(entrypointData, config),
    onRunLint: (srcPath, inputFiles) =>
      handleRunLint(srcPath, inputFiles, config),
    onRunTypeCheck: (srcPath, inputFiles, tsconfig) =>
      handleRunTypeCheck(srcPath, inputFiles, tsconfig, config),
    onCompileGo: handleCompileGo,
    onBuildDotnet: handleBuildDotnet,
    onBuildPython: handleBuildPython,
    onAddWatchedFiles: handleAddWatchedFiles,
    onRemoveWatchedFiles: handleRemoveWatchedFiles,
    onStatusUpdated: (status) => {
      apiServer &&
        apiServer.publish("LAMBDA_STATUS_UPDATED", {
          lambdaStatusUpdated: status,
        });
    },
  });
  await lambdaWatcherState.runInitialBuild(IS_TEST);

  // Save Lambda watcher state to file
  if (IS_TEST) {
    const testOutputPath = path.join(
      paths.appPath,
      paths.appBuildDir,
      "test-output.json"
    );
    fs.writeFileSync(
      testOutputPath,
      JSON.stringify(lambdaWatcherState.getState())
    );
    process.exit(0);
    return;
  }

  // Start code watcher, Lambda runtime server, and GraphQL server
  await startWatcher();
  await startRuntimeServer();
  if (argv.console) {
    isConsoleEnabled = true;
    await startApiServer();
  }
  startWebSocketClient();
};

async function deployDebugStack(argv, config, cliInfo) {
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
  const appBuildLibPath = path.join(paths.appBuildPath, "lib");
  const cdkOptions = {
    ...cliInfo.cdkOptions,
    app: `node bin/index.js ${stackName} ${config.stage} ${config.region} ${paths.appPath} ${appBuildLibPath}`,
    output: "cdk.out",
  };

  // Change working directory
  // Note: When deploying the debug stack, the current working directory is user's app.
  //       Setting the current working directory to debug stack cdk app directory to allow
  //       Lambda Function construct be able to reference code with relative path.
  process.chdir(path.join(paths.ownPath, "assets", "debug-stack"));

  // Build
  await synth(cdkOptions);

  // Deploy
  const deployRet = await deploy(cdkOptions);

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

  return deployRet[0].outputs;
}
// This is a bad pattern but needs a larger refactor to avoid
const bridge = new Bridge.Server();
async function deployApp(argv, config, cliInfo) {
  if (argv.udp) {
    clientLogger.info(chalk.grey(`Using UDP connection`));
    bridge.onRequest(async (req) => {
      const { debugSrcPath, debugSrcHandler, debugRequestTimeoutInMs } = req;
      const timeoutAt = Date.now() + debugRequestTimeoutInMs;
      const ret = await lambdaWatcherState.getTranspiledHandler(
        debugSrcPath,
        debugSrcHandler
      );
      const runtime = ret.runtime;
      const transpiledHandler = ret.handler;
      clientLogger.debug("Transpiled handler", {
        debugSrcPath,
        debugSrcHandler,
      });
      clientLogger.info(
        chalk.grey(
          `${req.context.awsRequestId} REQUEST ${
            req.env.AWS_LAMBDA_FUNCTION_NAME
          } [${getHandlerFullPosixPath(debugSrcPath, debugSrcHandler)}]`
        )
      );

      clientLogger.debug("Invoking local function...");
      const result = await server.invoke({
        function: {
          runtime,
          srcPath: getHandlerFullPosixPath(debugSrcPath, debugSrcHandler),
          outPath: "not_implemented",
          transpiledHandler,
        },
        env: {
          ...getSystemEnv(),
          ...req.env,
        },
        payload: {
          event: req.event,
          context: req.context,
          deadline: timeoutAt,
        },
      });

      if (result.type === "success") {
        clientLogger.info(
          chalk.grey(
            `${req.context.awsRequestId} RESPONSE ${objectUtil.truncate(
              result.data,
              {
                totalLength: 1500,
                arrayLength: 10,
                stringLength: 100,
              }
            )}`
          )
        );
        return {
          type: "success",
          body: result.data,
        };
      }

      if (result.type === "failure") {
        clientLogger.info(
          `${chalk.grey(req.context.awsRequestId)} ${chalk.red("ERROR")}`,
          util.inspect(result.rawError, { depth: null })
        );
        return {
          type: "failure",
          body: {
            errorMessage: result.rawError.errorMessage,
            errorType: result.rawError.errorType,
            stackTrace: result.rawError.trace,
          },
        };
      }
    });
    config.debugBridge = await bridge.start(debugBucketName);
  }

  logger.info("");
  logger.info("===============");
  logger.info(" Deploying app");
  logger.info("===============");
  logger.info("");

  await writeConfig({
    ...config,
    debugEndpoint,
    debugBucketArn,
    debugBucketName,
    debugStartedAt,
    debugIncreaseTimeout: argv.increaseTimeout || false,
  });

  // Build
  const cdkManifest = await synth(cliInfo.cdkOptions);
  const cdkOutPath = path.join(paths.appBuildPath, "cdk.out");
  const checksumData = generateChecksumData(cdkManifest, cdkOutPath);

  let deployRet;
  if (IS_TEST) {
    deployRet = [];
  } else {
    // Deploy
    deployRet = await deploy(cliInfo.cdkOptions);

    // Check all stacks deployed successfully
    if (
      deployRet.some((stack) => stack.status === STACK_DEPLOY_STATUS.FAILED)
    ) {
      throw new Error(`Failed to deploy the app`);
    }
  }

  // Write outputsFile
  if (argv.outputsFile) {
    await writeOutputsFile(
      deployRet,
      path.join(paths.appPath, argv.outputsFile)
    );
  }

  return { deployRet, checksumData };
}
async function startWatcher() {
  // Watcher will build all the Lambda handlers on start and rebuild on code change
  watcher = new Watcher({
    cdkFiles: cdkWatcherState.getWatchedFiles(),
    lambdaFiles: lambdaWatcherState.getWatchedFiles(),
    onFileChange: (file) => {
      cdkWatcherState.handleFileChange(file);
      lambdaWatcherState.handleFileChange(file);
    },
  });
}
async function startRuntimeServer() {
  const port = await chooseServerPort(RUNTIME_SERVER_PORT);
  server = new Runtime.Server({ port });
  // remove trailing slash b/c when printed to the terminal, `console.log` will
  // add a trailing slash
  server.onStdErr.add((arg) => {
    arg.data.endsWith("\n")
      ? clientLogger.trace(arg.data.slice(0, -1))
      : clientLogger.trace(arg.data);
  });
  server.onStdOut.add((arg) => {
    arg.data.endsWith("\n")
      ? clientLogger.trace(arg.data.slice(0, -1))
      : clientLogger.trace(arg.data);
  });
  server.listen();
}
async function startApiServer() {
  const port = await chooseServerPort(API_SERVER_PORT);
  apiServer = new ApiServer({
    constructsState,
    cdkWatcherState,
    lambdaWatcherState,
  });
  await apiServer.start(port);

  logger.info(
    `\nYou can now view the SST Console in the browser: ${chalk.cyan(
      `http://localhost:${port}`
    )}`
  );
  // note: if working on the CLI package (ie. running within the CLI package),
  //       print out how to start up console.
  if (isRunningWithinCliPackage()) {
    logger.info(
      `If you are working on the SST Console, navigate to ${chalk.cyan(
        "assets/console"
      )} and run ${chalk.cyan(`REACT_APP_SST_PORT=${port} yarn start`)}`
    );
  }
}
function addInputListener() {
  if (IS_TEST) {
    return;
  }

  process.stdin.on("data", () => {
    cdkWatcherState && cdkWatcherState.handleDeploy();
  });

  process.on("SIGINT", function () {
    console.log(
      chalk.yellow(
        "\nStopping Live Lambda Dev, run `sst deploy` to deploy the latest changes."
      )
    );
    process.exit(0);
  });
}

////////////////////////////
// CDK Reloader functions //
////////////////////////////

async function handleCdkReBuild() {
  try {
    const inputFiles = await reTranpileCdk();
    cdkWatcherState.handleReBuildSucceeded({ inputFiles });
  } catch (e) {
    const errors = await esbuild.formatMessages(e.errors, {
      kind: "error",
      color: true,
    });
    cdkWatcherState.handleReBuildFailed({ errors });
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

  let output = "";
  const cp = spawn(
    "node",
    [
      path.join(paths.appBuildPath, "eslint.js"),
      process.env.NO_COLOR === "true" ? "--no-color" : "--color",
      ...inputFiles,
    ],
    { stdio: "pipe", cwd: paths.ownPath }
  );
  cp.stdout.on("data", (data) => {
    data = data.toString();
    output += data.endsWith("\n") ? data : `${data}\n`;
    process.stdout.write(data);
  });
  cp.stderr.on("data", (data) => {
    data = data.toString();
    output += data.endsWith("\n") ? data : `${data}\n`;
    process.stderr.write(data);
  });
  cp.on("close", (code) => {
    cdkWatcherState.handleLintDone({ cp, code, output });
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

  let output = "";
  const cp = spawn(
    getTsBinPath(),
    [
      "--noEmit",
      "--pretty",
      process.env.NO_COLOR === "true" ? "false" : "true",
    ],
    {
      stdio: "pipe",
      cwd: paths.appPath,
    }
  );
  cp.stdout.on("data", (data) => {
    data = data.toString();
    output += data.endsWith("\n") ? data : `${data}\n`;
    process.stdout.write(data);
  });
  cp.stderr.on("data", (data) => {
    data = data.toString();
    output += data.endsWith("\n") ? data : `${data}\n`;
    process.stderr.write(data);
  });
  cp.on("close", (code) => {
    cdkWatcherState.handleTypeCheckDone({ cp, code, output });
  });

  return cp;
}
function handleCdkSynth(cliInfo) {
  const synthPromise = synth(cliInfo.cdkOptions);
  synthPromise
    .then((cdkManifest) => {
      const cdkOutPath = path.join(paths.appBuildPath, "cdk.out");
      const checksumData = generateChecksumData(cdkManifest, cdkOutPath);
      cdkWatcherState.handleSynthDone({ error: null, checksumData });
    })
    .catch((e) => {
      cdkWatcherState.handleSynthDone({
        error: e,
        isCancelled: e.cancelled,
      });
    });
  return synthPromise;
}
async function handleCdkReDeploy(cliInfo) {
  // Load the new Lambda and constructs info that will be deployed
  // note: we need to fetch the information now, because the files
  //       can be changed while deploying.
  const lambdaHandlers = await getDeployedLambdaHandlers();
  const constructsInfo = await getDeployedConstructs();

  // Deploy
  const deployRet = await deploy(cliInfo.cdkOptions);

  // Build failed message
  const deployFailedMessages = deployRet
    .filter((stack) => stack.status === STACK_DEPLOY_STATUS.FAILED)
    .map((stack) => chalk.red(`${stack.name}: ${stack.errorMessage}`));
  if (deployFailedMessages.length > 0) {
    cdkWatcherState.handleReDeployDone({
      error: deployFailedMessages.join("\n"),
    });
    return;
  }

  // Update Lambda state
  lambdaWatcherState.handleUpdateLambdaHandlers(lambdaHandlers);
  constructsState.handleUpdateConstructs(constructsInfo);

  // Update StaticSite environment outputs
  await updateStaticSiteEnvironmentOutputs(deployRet);

  cdkWatcherState.handleReDeployDone({ error: null });
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

async function handleTranspileNode(
  { srcPath, handler, bundle, esbuilder, onSuccess, onFailure },
  config
) {
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
      : await runTranspileNode(
          config,
          srcPath,
          handler,
          bundle,
          metafile,
          tsconfig,
          fullPath,
          outSrcPath
        );
    if (server)
      server.drain({
        srcPath: path.join(srcPath, handler),
        outPath: outSrcPath,
      });

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
  } catch (e) {
    logger.debug("handleTranspileNode error", e);
    const errors = await esbuild.formatMessages(e.errors, {
      kind: "error",
      color: true,
    });
    onFailure({ errors });
  }
}
async function runTranspileNode(
  config,
  srcPath,
  handler,
  bundle,
  metafile,
  tsconfig,
  fullPath,
  outSrcPath
) {
  logger.debug(`Transpiling ${handler}...`);

  // Start esbuild service is has not started
  if (!esbuildService) {
    esbuildService = esbuild;
  }

  // Get custom esbuild config
  const customConfig = await loadEsbuildConfigOverrides(
    config.esbuildConfig || bundle.esbuildConfig
  );

  const result = await esbuildService.build({
    external: await getEsbuildExternal(srcPath),
    loader: getEsbuildLoader(bundle),
    metafile: true,
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
    ...customConfig,
  });
  require("fs").writeFileSync(metafile, JSON.stringify(result.metafile));
  return result;
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
  // note: invoke LambdaWatcherState.handleLintDone() even if it's not run. B/c
  //       if both Lint and TypeCheck are disabled, neither handleLintDone() or
  //       handleTypeCheckDone() will be called. And in turn updateState() will
  //       not be called in LambdaWatcherState. This will lead to the state stuck
  //       in the "Rebuilding code..." state.
  //       Hence, call handleLintDone() in a setTimeout to mimic the lint
  //       process has completed.
  if (!config.lint) {
    setTimeout(() => lambdaWatcherState.handleLintDone({ srcPath }), 0);
    return null;
  }

  inputFiles = inputFiles.filter(
    (file) =>
      file.indexOf("node_modules") === -1 &&
      (file.endsWith(".ts") || file.endsWith(".js"))
  );

  // Validate inputFiles
  if (inputFiles.length === 0) {
    setTimeout(() => lambdaWatcherState.handleLintDone({ srcPath }), 0);
    return null;
  }

  let output = "";
  const cp = spawn(
    "node",
    [
      path.join(paths.appBuildPath, "eslint.js"),
      process.env.NO_COLOR === "true" ? "--no-color" : "--color",
      ...inputFiles,
    ],
    { stdio: "pipe", cwd: paths.ownPath }
  );
  cp.stdout.on("data", (data) => {
    data = data.toString();
    output += data.endsWith("\n") ? data : `${data}\n`;
    process.stdout.write(data);
  });
  cp.stderr.on("data", (data) => {
    data = data.toString();
    output += data.endsWith("\n") ? data : `${data}\n`;
    process.stderr.write(data);
  });
  cp.on("close", (code) => {
    logger.debug(`linter exited with code ${code}`);
    lambdaWatcherState.handleLintDone(
      code === 0 ? { srcPath, output } : { srcPath, output, error: true }
    );
  });

  return cp;
}
function handleRunTypeCheck(srcPath, inputFiles, tsconfig, config) {
  // Validate typeCheck enabled
  // note: invoke LambdaWatcherState.handleTypeCheckDone() even if it's not run. B/c
  //       if both Lint and TypeCheck are disabled, neither handleLintDone() or
  //       handleTypeCheckDone() will be called. And in turn updateState() will
  //       not be called in LambdaWatcherState. This will lead to the state stuck
  //       in the "Rebuilding code..." state.
  //       Hence, call handleTypeCheckDone() in a setTimeout to mimic the type check
  //       process has completed.
  if (!config.typeCheck) {
    setTimeout(() => lambdaWatcherState.handleTypeCheckDone({ srcPath }), 0);
    return null;
  }

  const tsFiles = inputFiles.filter((file) => file.endsWith(".ts"));

  // Validate tsFiles
  if (tsFiles.length === 0) {
    setTimeout(() => lambdaWatcherState.handleTypeCheckDone({ srcPath }), 0);
    return null;
  }

  if (tsconfig === undefined) {
    logger.error(
      `Cannot find a "tsconfig.json" in the function's srcPath: ${path.resolve(
        srcPath
      )}`
    );
    setTimeout(() => lambdaWatcherState.handleTypeCheckDone({ srcPath }), 0);
    return null;
  }

  let output = "";
  const cp = spawn(
    getTsBinPath(),
    [
      "--noEmit",
      "--pretty",
      process.env.NO_COLOR === "true" ? "false" : "true",
    ],
    {
      stdio: "pipe",
      cwd: path.join(paths.appPath, srcPath),
    }
  );
  cp.stdout.on("data", (data) => {
    data = data.toString();
    output += data.endsWith("\n") ? data : `${data}\n`;
    process.stdout.write(data);
  });
  cp.stderr.on("data", (data) => {
    data = data.toString();
    output += data.endsWith("\n") ? data : `${data}\n`;
    process.stderr.write(data);
  });
  cp.on("close", (code) => {
    logger.debug(`type checker exited with code ${code}`);
    lambdaWatcherState.handleTypeCheckDone(
      code === 0 ? { srcPath, output } : { srcPath, output, error: true }
    );
  });

  return cp;
}

async function getHandlerFilePath(appPath, srcPath, handler) {
  // Check entry path exists
  let entryPath;
  const entryPathExists = [".ts", ".tsx", ".js", ".jsx"].some((ext) => {
    entryPath = path.join(
      appPath,
      srcPath,
      addExtensionToHandler(handler, ext)
    );
    return fs.existsSync(entryPath);
  });

  // Print out the error message and throw
  if (!entryPathExists) {
    const handlerPosixPath = getHandlerFullPosixPath(srcPath, handler);
    const errorMessage = `Cannot find a handler file for "${handlerPosixPath}"`;
    logger.error(`${chalk.red("error")} ${errorMessage}\n`);
    throw new Error(errorMessage);
  }

  return entryPath;
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

  // Always include "aws-sdk" in externals
  // Note: this helps with the case where "aws-sdk" is not listed in the srcPath's
  //       package.json. It could be in parent directories' package.json.
  //
  //       Example 1: the SST app is a package inside a yarn workspace, and
  //                  "aws-sdk" is in repo root's package.json.
  //       Example 2: the SST app is at the repo root, but the Lambda function has
  //                  a srcPath. And "aws-sdk" is in repo root's package.json.
  //
  //       The long term fix is to run `esbuild` and if the input files contain
  //       "node_modules/XYZ", kill the esbuild service. And remember "XYZ". And
  //       the next time the function gets invoked, start a new esbuild process,
  //       and set "XYZ" as an external. Need to check other packages in the Yarn
  //       workspace do not show up as "node_modules" in the input files. Because
  //       we want them to be included in input files and watch them.
  if (!externals.includes("aws-sdk")) {
    externals.push("aws-sdk");
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
    if (server)
      server.drain({
        srcPath: path.join(srcPath, handler),
        outPath: "not_implemented",
      });
    onSuccess({
      outEntryPoint: {
        entry: outEntry,
        origHandlerFullPosixPath: getHandlerFullPosixPath(srcPath, handler),
      },
      inputFiles: [],
    });
  } catch (e) {
    logger.debug("handleCompileGo error", e);
    onFailure({ errors: [e.output ? e.output : util.inspect(e)] });
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
  } else {
    relBinPath = path.join(paths.appBuildDir, handler, "main");
  }

  // Append ".exe" for Windows
  if (process.platform === "win32") {
    relBinPath = `${relBinPath}.exe`;
  }

  logger.debug(`Building ${absHandlerPath}...`);

  return new Promise((resolve, reject) => {
    let output = "";
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
        stdio: "pipe",
        env: {
          ...process.env,
          // Compile for local runtime b/c the go executable will be run locally
          //GOOS: "linux",
        },
        cwd: absSrcPath,
      }
    );
    cp.stdout.on("data", (data) => {
      data = data.toString();
      output += data.endsWith("\n") ? data : `${data}\n`;
      process.stdout.write(data);
    });
    cp.stderr.on("data", (data) => {
      data = data.toString();
      output += data.endsWith("\n") ? data : `${data}\n`;
      process.stderr.write(data);
    });
    cp.on("error", (e) => {
      logger.debug("go build error", e);
    });
    cp.on("close", (code) => {
      logger.debug(`go build exited with code ${code}`);
      if (code !== 0) {
        const error = new Error(
          `There was an problem compiling the handler at "${absHandlerPath}".`
        );
        error.output = output;
        reject(error);
      } else {
        resolve({
          outEntry: path.join(absSrcPath, relBinPath),
        });
      }
    });
  });
}

//////////////////////////////////////
// Lambda Reloader functions - .NET //
//////////////////////////////////////

async function handleBuildDotnet({ srcPath, handler, onSuccess, onFailure }) {
  try {
    const { outEntry } = await runBuildDotnet(srcPath, handler);
    if (server)
      server.drain({
        srcPath: path.join(srcPath, handler),
        outPath: "not_implemented",
      });
    onSuccess({
      outEntryPoint: {
        entry: outEntry,
        handler,
        origHandlerFullPosixPath: getHandlerFullPosixPath(srcPath, handler),
      },
      inputFiles: [],
    });
  } catch (e) {
    logger.debug("handleBuildDotnet error", e);
    onFailure({ errors: [e.output ? e.output : util.inspect(e)] });
  }
}
function runBuildDotnet(srcPath, handler) {
  // Sample input:
  //  srcPath     'services/user-service'
  //  handler     'Api::Api.MyClass::MyFn'
  //
  // Sample output path:
  //  assembly          'Api'
  //  absSrcPath        'services/user-service'
  //  absHandlerPath    'services/user-service/Api::Api.MyClass::MyFn'
  //  absOutputPath     'services/user-service/.build/Api-Api.MyClass-MyFn'
  //  outEntry          'services/user-service/.build/Api-Api.MyClass-MyFn/Api.dll'

  const assembly = handler.split("::")[0];
  const absSrcPath = path.join(paths.appPath, srcPath);
  const absHandlerPath = path.join(paths.appPath, srcPath, handler);
  // On Windows, you cannot have ":" in a folder name
  const absOutputPath = path
    .join(paths.appPath, srcPath, paths.appBuildDir, handler)
    .replace(/::/g, "-");
  const outEntry = path.join(absOutputPath, `${assembly}.dll`);

  logger.debug(`Building ${absHandlerPath}...`);

  return new Promise((resolve, reject) => {
    let output = "";
    const cp = spawn(
      "dotnet",
      [
        "publish",
        "--output",
        absOutputPath,
        "--configuration",
        "Release",
        "--framework",
        "netcoreapp3.1",
        "/p:GenerateRuntimeConfigurationFiles=true",
        "/clp:ForceConsoleColor",
        // warnings are not reported for repeated builds by default and this flag
        // does a clean before build. It takes a little longer to run, but the
        // warnings are consistently printed on each build.
        //"/target:Rebuild",
        "--self-contained",
        "false",
        // do not print "Build Engine version"
        "-nologo",
        // only print errors
        "--verbosity",
        process.env.DEBUG ? "minimal" : "quiet",
      ],
      {
        stdio: "pipe",
        cwd: absSrcPath,
      }
    );
    cp.stdout.on("data", (data) => {
      data = data.toString();
      output += data;
      process.stdout.write(data);
    });
    cp.stderr.on("data", (data) => {
      data = data.toString();
      output += data;
      process.stderr.write(data);
    });
    cp.on("error", (e) => {
      logger.debug(".NET build error", e);
    });
    cp.on("close", (code) => {
      logger.debug(`.NET build exited with code ${code}`);
      if (code !== 0) {
        const error = new Error(
          `There was an problem compiling the handler at "${absHandlerPath}".`
        );
        error.output = output;
        reject(error);
      } else {
        resolve({ outEntry });
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
  if (server)
    server.drain({
      srcPath: path.join(srcPath, handler),
      outPath: "not_implemented",
    });

  Promise.resolve("success").then(() =>
    onSuccess({
      outEntryPoint: {
        entry: outEntry,
        handler: outHandler,
        srcPath,
        origHandlerFullPosixPath: getHandlerFullPosixPath(srcPath, handler),
      },
      inputFiles: [],
    })
  );
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
async function getDeployedConstructs() {
  // Load Lambda handlers
  // ie. [{"type":"Api","stack":"dev-playground-api","name":"Api"},{"type":"Cron","stack":"dev-playground-another","name":"Cron"}]

  const filePath = path.join(
    paths.appPath,
    paths.appBuildDir,
    "sst-constructs.json"
  );

  if (!(await checkFileExists(filePath))) {
    throw new Error(`Failed to get the constructs info from the app`);
  }

  return await fs.readJson(filePath);
}
async function updateStaticSiteEnvironmentOutputs(deployRet) {
  // ie. environments outputs
  // [{
  //    id: "MyFrontend",
  //    path: "src/sites/react-app",
  //    stack: "dev-playground-another",
  //    environmentOutputs: {
  //      "REACT_APP_API_URL":"FrontendSSTSTATICSITEENVREACTAPPAPIURLFAEF5D8C",
  //      "ABC":"FrontendSSTSTATICSITEENVABC527391D2"
  //    }
  // }]
  //
  // ie. deployRet
  // [{
  //    name: "dev-playground-another",
  //    outputs: {
  //      "FrontendSSTSTATICSITEENVREACTAPPAPIURLFAEF5D8C":"https://...",
  //      "FrontendSSTSTATICSITEENVABC527391D2":"hi"
  //    }
  // }]
  const environmentOutputKeysPath = path.join(
    paths.appPath,
    paths.appBuildDir,
    "static-site-environment-output-keys.json"
  );
  const environmentOutputValuesPath = path.join(
    paths.appPath,
    paths.appBuildDir,
    "static-site-environment-output-values.json"
  );

  if (!(await checkFileExists(environmentOutputKeysPath))) {
    throw new Error(`Failed to get the StaticSite info from the app`);
  }

  // Replace output value with stack output
  const environments = await fs.readJson(environmentOutputKeysPath);
  environments.forEach(({ stack, environmentOutputs }) => {
    const stackData = deployRet.find(({ name }) => name === stack);
    if (stackData) {
      Object.entries(environmentOutputs).forEach(([envName, outputName]) => {
        environmentOutputs[envName] = stackData.outputs[outputName];
      });
    }
  });

  // Update file
  await fs.writeJson(environmentOutputValuesPath, environments);
}
function generateChecksumData(cdkManifest, cdkOutPath) {
  const checksums = {};
  cdkManifest.stacks.forEach(({ name }) => {
    const templatePath = path.join(cdkOutPath, `${name}.template.json`);
    const templateContent = fs.readFileSync(templatePath);
    checksums[name] = generateChecksum(templateContent);
  });
  return checksums;
}
function generateChecksum(templateContent) {
  const hash = crypto.createHash("sha1");
  hash.setEncoding("hex");
  hash.write(templateContent);
  hash.end();
  return hash.read();
}
async function chooseServerPort(defaultPort) {
  const host = "0.0.0.0";
  logger.debug(`Checking port ${defaultPort} on host ${host}`);

  try {
    return detect(defaultPort, host);
  } catch (err) {
    throw new Error(
      chalk.red(`Could not find an open port at ${chalk.bold(host)}.`) +
        "\n" +
        ("Network error message: " + err.message || err) +
        "\n"
    );
  }
}
function isRunningWithinCliPackage() {
  return (
    path.resolve(__filename) ===
    path.resolve(
      path.join(
        __dirname,
        "..",
        "..",
        "..",
        "packages",
        "cli",
        "scripts",
        "start.js"
      )
    )
  );
}

///////////////////////////////
// Websocke Client functions //
///////////////////////////////

function startWebSocketClient() {
  wsLogger.debug("startWebSocketClient", debugEndpoint, debugBucketName);

  clientState.ws = new WebSocket(debugEndpoint);

  clientState.ws.on("open", () => {
    wsLogger.debug("WebSocket connection opened");
    clientState.ws.send(JSON.stringify({ action: "client.register" }));
    startKeepAliveMonitor();
  });

  clientState.ws.on("close", (code, reason) => {
    wsLogger.debug("Websocket connection closed", { code, reason });

    // Stop keep-alive timer first to timer sending a keep alive call before
    // the reconnect is finished. Which will throw an exception.
    stopKeepAliveMonitor();

    // Case: disconnected due to new client connected => do not reconnect
    if (code === WEBSOCKET_CLOSE_CODE.NEW_CLIENT_CONNECTED) {
      wsLogger.debug("Websocket connection closed due to new client connected");
      process.exit(0);
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

  // Create keep-alive timer
  clientState.wsKeepAliveTimer = setInterval(() => {
    if (clientState.ws) {
      wsLogger.debug("Sending keep-alive call");
      clientState.ws.send(JSON.stringify({ action: "client.keepAlive" }));
    }
  }, 60000);
}

function stopKeepAliveMonitor() {
  wsLogger.debug("stopKeepAliveMonitor");

  if (clientState.wsKeepAliveTimer) {
    clearTimeout(clientState.wsKeepAliveTimer);
    wsLogger.debug("Keep-alive timer cleared");
  }
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
  if (data.action === "register") {
    bridge.addPeer(data.body);
    bridge.ping();
    return;
  }
  if (data.action !== "stub.lambdaRequest") {
    clientLogger.debug("Unkonwn websocket message received.");
    return;
  }

  // Parse payload
  const { stubConnectionId, debugRequestId, payload, payloadS3Key } = data;
  let payloadData;
  if (payload) {
    clientLogger.debug("Fetching payload inline");
    payloadData = Buffer.from(payload, "base64");
  } else {
    clientLogger.debug("Fetching payload from S3");
    const s3Ret = await s3
      .getObject({
        Bucket: debugBucketName,
        Key: payloadS3Key,
      })
      .promise();
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
    eventSource === null ? " invoked" : ` invoked by ${eventSource}`;
  clientLogger.trace(
    chalk.grey(
      `${context.awsRequestId} REQUEST ${
        env.AWS_LAMBDA_FUNCTION_NAME
      } [${getHandlerFullPosixPath(
        debugSrcPath,
        debugSrcHandler
      )}]${eventSourceDesc}`
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
    clientLogger.trace(
      chalk.grey(`${context.awsRequestId} ${chalk.red("ERROR")} ${e.message}`)
    );

    // send Lambda response
    sendLambdaResponse();

    return;
  }

  // Invoke local function
  clientLogger.debug("Invoking local function...");
  server
    .invoke({
      function: {
        runtime,
        srcPath: getHandlerFullPosixPath(debugSrcPath, debugSrcHandler),
        outPath: "not_implemented",
        transpiledHandler,
      },
      env: {
        ...getSystemEnv(),
        ...env,
      },
      payload: {
        event,
        context,
        deadline: timeoutAt,
      },
    })
    .then((data) => {
      handleResponse(data);
      printLambdaResponse();
      sendLambdaResponse();
    });

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
      clientLogger.trace(
        chalk.grey(
          `${context.awsRequestId} ${chalk.red("ERROR")} Lambda timed out`
        )
      );
    } else if (lambdaResponse.type === "success") {
      clientLogger.trace(
        chalk.grey(
          `${context.awsRequestId} RESPONSE ${objectUtil.truncate(
            lambdaResponse.data,
            {
              totalLength: 1500,
              arrayLength: 10,
              stringLength: 100,
            }
          )}`
        )
      );
    } else if (lambdaResponse.type === "failure") {
      clientLogger.trace(
        [
          chalk.grey(context.awsRequestId),
          chalk.red("ERROR"),
          util.inspect(lambdaResponse.rawError, { depth: null }),
        ].join(" ")
      );
    } else if (lambdaResponse.type === "exit") {
      clientLogger.trace(
        [
          chalk.grey(context.awsRequestId),
          chalk.red("ERROR"),
          lambdaResponse.code === 0
            ? "Runtime exited without providing a reason"
            : `Runtime exited with error: exit status ${lambdaResponse.code}`,
        ].join(" ")
      );
    }
  }

  function sendLambdaResponse() {
    // Do not send a response for timeout, let stub timeout
    if (lambdaResponse.type === "timeout") {
      return;
    }

    // Zipping payload
    const payload = zlib.gzipSync(
      JSON.stringify({
        responseData: lambdaResponse.data,
        responseError: lambdaResponse.error,
        responseExitCode: lambdaResponse.code,
      })
    );
    const payloadBase64 = payload.toString("base64");
    // payload fits into 1 WebSocket frame (limit is 32KB)
    if (payloadBase64.length < 32000) {
      clientLogger.debug(`Sending payload via WebSocket`);
      clientState.ws.send(
        JSON.stringify({
          action: "client.lambdaResponse",
          debugRequestId,
          stubConnectionId,
          payload: payloadBase64,
        })
      );
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
        clientState.ws.send(
          JSON.stringify({
            action: "client.lambdaResponse",
            debugRequestId,
            stubConnectionId,
            payloadS3Key: s3Params.Key,
          })
        );
      });
    }
  }
}

function addExtensionToHandler(handler, extension) {
  return handler.replace(/\.[\w\d]+$/, extension);
}
function getHandlerFullPosixPath(srcPath, handler) {
  return srcPath === "." ? handler : `${srcPath}/${handler}`;
}
function getSystemEnv() {
  const env = { ...process.env };
  // AWS_PROFILE is defined if users run `AWS_PROFILE=xx sst start`, and in
  // aws sdk v3, AWS_PROFILE takes precedence over AWS_ACCESS_KEY_ID/AWS_SECRET_ACCESS_KEY.
  // Hence we need to remove it to ensure the invoked function uses the IAM
  // credentials from the remote Lambda.
  delete env.AWS_PROFILE;
  return env;
}
function forwardToBrowser(message) {
  apiServer &&
    apiServer.publish("RUNTIME_LOG_ADDED", {
      runtimeLogAdded: {
        message: message.endsWith("\n") ? message : `${message}\n`,
      },
    });
}
