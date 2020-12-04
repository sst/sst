"use strict";

const path = require("path");
const chalk = require("chalk");
const WebSocket = require("ws");
const spawn = require("cross-spawn");

const sstDeploy = require("./deploy");
const paths = require("./util/paths");
const {
  prepareCdk,
  applyConfig,
  deploy: cdkDeploy,
} = require("./util/cdkHelpers");
const array = require("../lib/array");
const logger = require("../lib/logger");

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
      logger.error("Cannot kill timed out Lambda");
    }
  }, timeoutInMs);
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

function onMessage(message) {
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
      logger.error(
        chalk.grey(context.awsRequestId) + ` ${lambdaResponse.error}`
      );
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
  startClient(config.debugEndpoint);
};
