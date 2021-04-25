"use strict";

const os = require("os");
const zlib = require("zlib");
const path = require("path");
const AWS = require("aws-sdk");
const fs = require("fs-extra");
const chalk = require("chalk");
const WebSocket = require("ws");
const spawn = require("cross-spawn");
const {
  logger,
  getChildLogger,
  STACK_DEPLOY_STATUS,
} = require("@serverless-stack/core");
const s3 = new AWS.S3();

const sstBuild = require("./build");
const sstDeploy = require("./deploy");
const paths = require("./util/paths");
const { exitWithMessage } = require("./util/processHelpers");
const {
  isGoRuntime,
  isNodeRuntime,
  isPythonRuntime,
  prepareCdk,
  checkFileExists,
} = require("./util/cdkHelpers");
const array = require("../lib/array");
const Watcher = require("./util/Watcher");
const LambdaRuntimeServer = require("./util/LambdaRuntimeServer");
const { serializeError, deserializeError } = require("../lib/serializeError");

// Setup logger
const wsLogger = getChildLogger("websocket");
const clientLogger = getChildLogger("client");

const WEBSOCKET_CLOSE_CODE = {
  NEW_CLIENT_CONNECTED: 4901,
};

let watcher;
let lambdaServer;
let debugEndpoint;
let debugBucketName;

const clientState = {
  ws: null,
  wsKeepAliveTimer: null,
};

const IS_TEST = process.env.__TEST__ === "true";

module.exports = async function (argv, config, cliInfo) {
  // Deploy debug stack
  const debugStackOutputs = await deployDebugStack(argv, cliInfo, config);
  config.debugEndpoint = debugStackOutputs.Endpoint;
  config.debugBucketArn = debugStackOutputs.BucketArn;
  config.debugBucketName = debugStackOutputs.BucketName;
  debugEndpoint = debugStackOutputs.Endpoint;
  debugBucketName = debugStackOutputs.BucketName;

  // Deploy app
  const cdkInputFiles = await deployApp(argv, cliInfo, config);

  // Load Lambda handlers
  // ie. { srcPath: "src/api", handler: "api.main", runtime: "nodejs12.x", bundle: {} },
  const lambdaHandlersPath = path.join(
    paths.appPath,
    paths.appBuildDir,
    "lambda-handlers.json"
  );
  const lambdaHandlers = await fs.readJson(lambdaHandlersPath);
  if (!(await checkFileExists(lambdaHandlersPath))) {
    exitWithMessage(`Failed to get the Lambda handlers info from the app`);
  }

  // Start watcher - the watcher will build all the Lambda handlers on start and rebuild on code change
  watcher = new Watcher({
    appPath: paths.appPath,
    lambdaHandlers,
    isLintEnabled: config.lint,
    isTypeCheckEnabled: config.typeCheck,
    cdkInputFiles,
  });
  try {
    await watcher.start(IS_TEST);
  } catch(e) {
    logger.debug("Failed to start watcher", e);
    watcher.stop();
    exitWithMessage(e.message);
  }

  // Do not continue if running test
  if (IS_TEST) {
    // save watcher state to file
    const testOutputPath = path.join(
      paths.appPath,
      paths.appBuildDir,
      "test-output.json"
    );
    fs.writeFileSync(testOutputPath, JSON.stringify(watcher.getState()));
    // stop watcher
    watcher.stop();
    return;
  }

  // Start Lambda runtime server
  // note: 0.0.0.0 does not work on Windows
  lambdaServer = new LambdaRuntimeServer();
  await lambdaServer.start("127.0.0.1", argv.port);

  // Start client
  startClient();
};

async function deployDebugStack(argv, cliInfo, config) {
  // Do not deploy if running test
  if (IS_TEST) {
    return {
      Endpoint: "ws://test-endpoint",
      BucketArn: "bucket-arn",
      BucketName: "bucket-name",
    };
  }

  const stackName = `${config.stage}-${config.name}-debug-stack`;

  logger.info("");
  logger.info("=======================");
  logger.info(" Deploying debug stack");
  logger.info("=======================");
  logger.info("");

  // Note: When deploying the debug stack, the current working directory is user's app.
  //       Setting the current working directory to debug stack cdk app directory to allow
  //       Lambda Function construct be able to reference code with relative path.
  process.chdir(path.join(paths.ownPath, "assets", "debug-stack"));
  let debugStackRet;
  try {
    debugStackRet = await sstDeploy(
      // do not generate outputs file for debug stack
      { ...argv, outputsFile: undefined },
      config,
      {
        ...cliInfo,
        cdkOptions: {
          ...cliInfo.cdkOptions,
          app: `node bin/index.js ${stackName} ${config.stage} ${config.region}`,
          output: "cdk.out",
        },
      }
    );
  } catch (e) {
    logger.error(e);
  }

  logger.debug("debugStackRet", debugStackRet);

  // Note: Restore working directory
  process.chdir(paths.appPath);

  // Get WebSocket endpoint
  if (
    !debugStackRet ||
    debugStackRet.length !== 1 ||
    debugStackRet[0].status === STACK_DEPLOY_STATUS.FAILED
  ) {
    exitWithMessage(`Failed to deploy debug stack ${stackName}`);
  } else if (!debugStackRet[0].outputs || !debugStackRet[0].outputs.Endpoint) {
    exitWithMessage(
      `Failed to get the endpoint from the deployed debug stack ${stackName}`
    );
  }

  return debugStackRet[0].outputs;
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
    if (stacks.some((stack) => stack.status === STACK_DEPLOY_STATUS.FAILED)) {
      exitWithMessage(`Failed to deploy the app`);
    }
  }

  return inputFiles;
}

///////////////////////////////
// Websocke Client functions //
///////////////////////////////

function startClient() {
  wsLogger.debug("startClient", debugEndpoint, debugBucketName);

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
    startClient();
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
      : ` invoked by ${chalk.cyan(eventSource)}`;
  clientLogger.info(
    chalk.grey(
      `${context.awsRequestId} REQUEST ${chalk.cyan(
        env.AWS_LAMBDA_FUNCTION_NAME
      )} [${debugSrcPath}/${debugSrcHandler}]${eventSourceDesc}`
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
    const ret = await watcher.getTranspiledHandler(
      debugSrcPath,
      debugSrcHandler
    );
    runtime = ret.runtime;
    transpiledHandler = ret.handler;
    clientLogger.debug("Transpiled handler", { debugSrcPath, debugSrcHandler });
  } catch (e) {
    clientLogger.error("Get transspiler handler error", e);
    // TODO: Handle esbuild transpilation error
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
  let lambdaResponse;
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

    returnLambdaResponse();
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

    // Handle success/failure
    else if (lambdaResponse.type === "success") {
      clientLogger.info(
        chalk.grey(
          `${context.awsRequestId} RESPONSE ${JSON.stringify(
            lambdaResponse.data
          )}`
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
