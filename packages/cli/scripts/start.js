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
const logger = require("../lib/logger");

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

const transpilers = {};
let externalsCache = {};

let ws;

function setTimer(lambda, handleResponse, timeoutInMs) {
  return setTimeout(function () {
    handleResponse({ type: "timeout" });

    try {
      process.kill(lambda.pid, "SIGKILL");
    } catch (e) {
      logger.log(e);
      logger.error("Cannot kill timed out Lambda");
    }
  }, timeoutInMs);
}

function getTranspilerKey(srcPath, handler) {
  return `${srcPath}/${handler}`;
}

async function getTranspiledHandler(srcPath, handler) {
  const transpiler = transpilers[getTranspilerKey(srcPath, handler)];

  await transpiler.esbuilder.rebuild();

  return transpiler.outHandler;
}

async function checkFileExists(file) {
  return fs.promises
    .access(file, fs.constants.F_OK)
    .then(() => true)
    .catch(() => false);
}

async function getCmdPath(cmd) {
  const appPath = path.join(paths.appNodeModules, ".bin", cmd);
  const ownPath = path.join(paths.ownNodeModules, ".bin", cmd);

  // Fallback to own node modules, in case of tests that don't install the cli
  return (await checkFileExists(appPath)) ? appPath : ownPath;
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
  if (externalsCache[srcPath]) {
    return externalsCache[srcPath];
  }

  let packageJson, externals;

  try {
    packageJson = await fs.promises.readFile(
      path.join(srcPath, "package.json"),
      { encoding: "utf-8" }
    );
    externals = Object.keys({
      ...(packageJson.dependencies || {}),
      ...(packageJson.devDependencies || {}),
      ...(packageJson.peerDependencies || {}),
    });
  } catch (e) {
    externals = [];
  }

  externalsCache[srcPath] = externals;

  return externals;
}

async function transpile(srcPath, handler) {
  const fullPath = await getHandlerFilePath(srcPath, handler);

  const compiledDir = "src";

  const external = await getAllExternalsForHandler(srcPath);

  const esbuilder = await esbuild.build({
    external,
    bundle: true,
    format: "cjs",
    sourcemap: true,
    platform: "node",
    incremental: true,
    entryPoints: [fullPath],
    outdir: path.join(paths.appBuildPath, compiledDir),
  });

  const transpiler = {
    esbuilder,
    outHandler: {
      handler,
      srcPath: path.join(paths.appBuildDir, compiledDir),
    },
  };

  transpilers[getTranspilerKey(srcPath, handler)] = transpiler;

  return transpiler;
}

async function lint(srcPath) {
  const linter = spawn(
    await getCmdPath("eslint"),
    [
      "--no-error-on-unmatched-pattern",
      "--config",
      path.join(paths.ownPath, "scripts", "util", ".eslintrc.js"),
      "--ext",
      ".js,.ts",
      "--fix",
      // Handling nested ESLint projects in Yarn Workspaces
      // https://github.com/serverless-stack/serverless-stack/issues/11
      "--resolve-plugins-relative-to",
      ".",
      srcPath,
    ],
    { stdio: "inherit", cwd: paths.appPath }
  );

  linter.on("close", (code) => {
    console.log(`child process exited with code ${code}`);
  });

  return linter;
}

async function typeCheck(srcPath) {
  const isTs = await checkFileExists(
    path.join(paths.appPath, srcPath, "tsconfig.json")
  );

  if (!isTs) {
    return null;
  }

  const typeChecker = spawn(await getCmdPath("tsc"), ["--noEmit"], {
    stdio: "inherit",
    cwd: path.join(paths.appPath, srcPath),
  });

  typeChecker.on("close", (code) => {
    console.log(`child process exited with code ${code}`);
  });

  return typeChecker;
}

async function cancelAllChecks(checks) {
  (await Promise.allSettled(checks)).forEach((result) => {
    if (result.status === "fulfilled") {
      result.value && result.value.kill();
    }
  });
}

function onFileChange(file, srcPath, handlers) {
  logger.log(`File change: ${file}`);
  console.log(srcPath, handlers);
}

async function startBuilder(entryPoints) {
  let hasError = false;

  const entryPointsIndexed = {};
  const transpilerPromises = [];

  externalsCache = {};

  function recordEntryPoint(srcPath, handler) {
    entryPointsIndexed[srcPath] = entryPointsIndexed[srcPath]
      ? entryPointsIndexed[srcPath].push(handler)
      : [handler];
  }

  function getUniqueSrcPaths() {
    return Object.keys(entryPointsIndexed);
  }

  function getHandlersForSrcPath(srcPath) {
    return entryPointsIndexed[srcPath];
  }

  entryPoints.forEach((entryPoint) => {
    const srcPath = entryPoint.debugSrcPath;

    const handler = entryPoint.debugSrcHandler;

    // Not catching esbuild errors
    // Letting it handle the error messages for now
    transpilerPromises.push(transpile(srcPath, handler));

    recordEntryPoint(srcPath, handler);
  });

  const uniquePaths = getUniqueSrcPaths();

  const lintPromises = uniquePaths.map(lint);
  const typeCheckPromises = uniquePaths.map(typeCheck);

  logger.log("Building Lambda code...");
  const results = await Promise.allSettled(transpilerPromises);

  results.forEach((result) => {
    if (result.status === "fulfilled") {
      return;
    }

    hasError = true;
    // Cancel all the running checks
    cancelAllChecks(lintPromises.concat(typeCheckPromises));
  });

  if (!hasError) {
    uniquePaths.forEach((srcPath) => {
      chokidar
        .watch(path.join(paths.appPath, srcPath), chokidarOptions)
        .on("all", (file) =>
          onFileChange(file, srcPath, getHandlersForSrcPath(srcPath))
        )
        .on("error", (error) => console.log(`Watch ${error}`))
        .on("ready", () => {
          console.log(`Watcher ready for ${srcPath}...`);
        });
    });
  }
}

function startClient(debugEndpoint) {
  ws = new WebSocket(debugEndpoint);

  ws.on("open", () => {
    ws.send(JSON.stringify({ action: "connectClient" }));
    logger.debug("WebSocket opened");
  });

  ws.on("close", (code, reason) => {
    logger.debug("Websocket closed");
    logger.log("Debug session closed", { code, reason });

    // Case: disconnected due to new client connected => do not reconnect
    // Case: disconnected due to 10min idle or 2hr WebSocket connection limit => reconnect
    if (code !== WEBSOCKET_CLOSE_CODE.NEW_CLIENT_CONNECTED) {
      logger.log("Debug session reconnecting...");
      startClient(debugEndpoint);
    }
  });

  ws.on("error", (e) => {
    logger.debug(`WebSocket error: ${e}`);
    logger.error(`Debug session error: ${e}`);
  });

  ws.on("message", onMessage);
}

async function onMessage(message) {
  logger.debug(`Message received: ${message}`);

  const data = JSON.parse(message);

  // Handle actions
  if (data.action === "clientConnected") {
    logger.log("Debug session started. Listening for requests...");
    logger.debug(`Client connection id: ${data.clientConnectionId}`);
    return;
  }
  if (data.action === "clientDisconnectedDueToNewClient") {
    logger.warn(
      "A new debug session has been started. This session will be closed..."
    );
    ws.close(WEBSOCKET_CLOSE_CODE.NEW_CLIENT_CONNECTED);
    return;
  }
  if (data.action === "failedToSendResponseDueToStubDisconnected") {
    logger.error(
      chalk.grey(debugRequestId) +
        " Failed to send a response because the Lambda function is disconnected"
    );
    return;
  }
  if (data.action === "failedToSendResponseDueToUnknown") {
    logger.error(
      chalk.grey(debugRequestId) +
        " Failed to send a response to the Lambda function"
    );
    return;
  }
  if (data.action !== "newRequest") {
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
  logger.log(
    chalk.grey(
      `${context.awsRequestId} REQUEST ${chalk.cyan(
        env.AWS_LAMBDA_FUNCTION_NAME
      )} [${debugSrcPath}/${debugSrcHandler}]${eventSourceDesc}`
    )
  );
  logger.debug(chalk.grey(JSON.stringify(event)));

  // From Lambda /var/runtime/bootstrap
  // https://link.medium.com/7ir11kKjwbb
  const newSpace = Math.floor(context.memoryLimitInMB / 10);
  const semiSpace = Math.floor(newSpace / 2);
  const oldSpace = context.memoryLimitInMB - newSpace;

  const transpiledHandler = await getTranspiledHandler(
    debugSrcPath,
    debugSrcHandler
  );

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
      //"./src", // Local path to the Lambda functions
      transpiledHandler.srcPath,
      //"hello.handler",
      transpiledHandler.handler,
    ],
    {
      stdio: ["inherit", "inherit", "inherit", "ipc"],
      cwd: paths.appPath,
      env: { ...process.env, ...env },
    }
  );
  const timer = setTimer(lambda, handleResponse, debugRequestTimeoutInMs);

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
      logger.debug(`Failed to parse event source ${e}`);
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
      logger.log(
        chalk.grey(
          `${context.awsRequestId} ${chalk.red("ERROR")} Lambda timed out`
        )
      );
      return;
    }

    // handle success/failure
    if (lambdaResponse.type === "success") {
      logger.log(
        chalk.grey(
          `${context.awsRequestId} RESPONSE ${JSON.stringify(
            lambdaResponse.data
          )}`
        )
      );
    } else if (lambdaResponse.type === "failure") {
      const errorMessage = lambdaResponse.error.message || lambdaResponse.error;
      console.log(lambdaResponse.error);
      logger.error(chalk.grey(context.awsRequestId) + ` ${errorMessage}`);
    }
    ws.send(
      JSON.stringify({
        debugRequestId,
        stubConnectionId,
        action: "newResponse",
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

module.exports = async function (argv, cliInfo) {
  const config = applyConfig(argv);
  const stackName = `${config.stage}-debug-stack`;

  // Deploy debug stack
  logger.log("");
  logger.log("=======================");
  logger.log(" Deploying debug stack");
  logger.log("=======================");
  logger.log("");
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
  config.debugEndpoint = debugStackRet.outputs.Endpoint;

  // Deploy app
  logger.log("");
  logger.log("===============");
  logger.log(" Deploying app");
  logger.log("===============");
  logger.log("");
  prepareCdk(argv, cliInfo, config);
  await sstDeploy(argv, config, cliInfo);

  // Start client
  logger.log("");
  logger.log("===================");
  logger.log(" Starting debugger");
  logger.log("===================");
  logger.log("");

  await startBuilder([
    { debugSrcPath: "src/api", debugSrcHandler: "api.handler" },
    { debugSrcPath: "src/sns", debugSrcHandler: "sns.handler" },
  ]);

  startClient(config.debugEndpoint);
};
