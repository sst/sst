"use strict";

const WebSocket = require("ws");
const spawn = require("cross-spawn");
const chalk = require("chalk");

const sstDeploy = require("./deploy");
const paths = require("./config/paths");
const {
  prepareCdk,
  applyConfig,
  deploy: cdkDeploy,
} = require("./config/cdkHelpers");
const logger = require("./util/logger");

const WEBSOCKET_CLOSE_CODE = {
  NEW_CLIENT_CONNECTED: 4901,
};

let ws;

function setTimer(lambda, handleResponse, timeoutInMs) {
  return setTimeout(function () {
    handleResponse({ type: "timeout" });

    try {
      process.kill(lambda.pid, "SIGKILL");
    } catch (e) {
      logger.log(e);
      logger.log("Cannot kill timed out Lambda");
    }
  }, timeoutInMs);
}

function startClient(debugEndpoint) {
  ws = new WebSocket(debugEndpoint);

  ws.on("open", () => {
    ws.send(JSON.stringify({ action: "connectClient" }));
    logger.debug("websocket opened");
  });

  ws.on("close", (code, reason) => {
    logger.debug("websocket closed");
    logger.log("Debug session closed.", { code, reason });

    // Case: disconnected due to new client connected => do not reconnect
    // Case: disconnected due to 10min idle or 2hr websocket connection limit => reconnect
    if (code !== WEBSOCKET_CLOSE_CODE.NEW_CLIENT_CONNECTED) {
      logger.log("Debug session reconnecting...");
      startClient(debugEndpoint);
    }
  });

  ws.on("error", (e) => {
    logger.debug(`websocket error: ${e}`);
    logger.log(`Debug session error: ${e}`);
  });

  ws.on("message", onMessage);
}

function onMessage(message) {
  logger.debug(`message received: ${message}`);

  const data = JSON.parse(message);

  // Handle actions
  if (data.action === "clientConnected") {
    logger.log("Debug session started. Listening for requests...");
    logger.debug(`client connection id: ${data.clientConnectionId}`);
    return;
  }
  if (data.action === "clientDisconnectedDueToNewClient") {
    logger.log(
      "A new debug session has been started. This session will be closed..."
    );
    ws.close(WEBSOCKET_CLOSE_CODE.NEW_CLIENT_CONNECTED);
    return;
  }
  if (data.action === "failedToSendResponseDueToStubDisconnected") {
    logger.log(
      chalk.grey(
        `${debugRequestId} ${chalk.red(
          "ERROR"
        )} Failed to send response because the Lambda function is not disconnected.`
      )
    );
    return;
  }
  if (data.action === "failedToSendResponseDueToUnknown") {
    logger.log(
      chalk.grey(
        `${debugRequestId} ${chalk.red(
          "ERROR"
        )} Failed to send response to the Lambda function.`
      )
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
    debugRequestExpireAt,
    debugRequestTimeoutInMs,
    debugSrcPath,
    debugSrcHandler,
  } = data;

  logger.log(
    chalk.grey(`${debugRequestId} REQUEST ${JSON.stringify(event, null, 4)}`)
  );

  // Validate request did not expire
  if (debugRequestExpireAt < Date.now()) {
    logger.log(chalk.grey(`${debugRequestId} DISCARDED ${debugRequestId}`));
    return;
  }

  // From Lambda /var/runtime/bootstrap
  // https://link.medium.com/7ir11kKjwbb
  const newSpace = Math.floor(context.memoryLimitInMB / 10);
  const semiSpace = Math.floor(newSpace / 2);
  const oldSpace = context.memoryLimitInMB - newSpace;

  let lambdaResponse;
  const lambda = spawn(
    "node",
    [
      `--max-old-space-size=${oldSpace}`,
      `--max-semi-space-size=${semiSpace}`,
      "--max-http-header-size=81920", // HTTP header limit of 8KB
      require.resolve("../scripts/wrapper/bootstrap.js"),
      JSON.stringify(event),
      JSON.stringify(context),
      //"./src", // Local path to the Lambda functions
      //"hello.handler",
      debugSrcPath,
      debugSrcHandler,
    ],
    {
      stdio: ["inherit", "inherit", "inherit", "ipc"],
      cwd: paths.appPath,
      env: { ...process.env, ...env },
    }
  );
  const timer = setTimer(lambda, handleResponse, debugRequestTimeoutInMs);

  function handleResponse(response) {
    console.log(response);
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
        chalk.grey(`${debugRequestId} ${chalk.red("ERROR")} Lambda timed out.`)
      );
      return;
    }

    // handle success/failure
    if (lambdaResponse.type === "success") {
      logger.log(
        chalk.grey(
          `${debugRequestId} RESPONSE ${JSON.stringify(
            lambdaResponse.data,
            null,
            4
          )}`
        )
      );
    } else if (lambdaResponse.type === "failure") {
      logger.log(chalk.grey(`${debugRequestId} ${chalk.red("ERROR")}`));
      console.log(lambdaResponse.error);
    }
    ws.send(
      JSON.stringify({
        action: "newResponse",
        debugRequestId,
        stubConnectionId,
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
  const debugAppEnvs = [
    `SST_DEBUG_STACK=${stackName}`,
    `SST_DEBUG_STAGE=${config.stage}`,
    `SST_DEBUG_REGION=${config.region}`,
  ];
  // Note: When deploying the debug stack, the current working directory is user's app.
  //       Setting the current working directory to debug stack cdk app directory to allow
  //       Lambda Function construct be able to reference code with relative path.
  process.chdir(`${paths.ownPath}/scripts/debug`);
  const debugStackRet = await cdkDeploy({
    ...cliInfo.cdkOptions,
    app: `${debugAppEnvs.join(" ")} node bin/index.js`,
    output: "cdk.out",
  });

  // Get websocket endpoint
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
  // Note: Restore working directory
  process.chdir(paths.appPath);
  prepareCdk(argv, cliInfo, config);
  await sstDeploy(argv, config, cliInfo);

  // Start client
  logger.log("");
  logger.log("===================");
  logger.log(" Starting debugger");
  logger.log("===================");
  logger.log("");
  startClient(config.debugEndpoint);
};
