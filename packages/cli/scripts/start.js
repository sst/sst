"use strict";

const spawn = require("cross-spawn");
const WebSocket = require("ws");
const AWS = require("aws-sdk");

const paths = require("./config/paths");
const deploy = require("./deploy");
const { execSync } = require("child_process");

function setTimer(lambda, handleResponse, timeoutInMs) {
  return setTimeout(function () {
    handleResponse({
      type: "failure",
      data: {
        stack: null,
        errorType: "timeout",
        errorMessage: "Lambda timed out",
      },
    });

    try {
      process.kill(lambda.pid, "SIGKILL");
    } catch (e) {
      console.log(e);
      console.log("Cannot kill timed out Lambda");
    }
  }, timeoutInMs);
}

function startClient(debugEndpoint) {
  console.log("Starting up sst debugger...");

  const ws = new WebSocket(debugEndpoint);

  ws.on("open", () => {
    ws.send(
      JSON.stringify({
        action: "registerClient",
      })
    );
    console.log("Debug session started. Listening for requests...");
  });

  ws.on("close", (code, reason) => {
    console.log("Debug session closed.", { code, reason });
  });

  ws.on("error", (e) => {
    console.log("Debug session error.", e);
  });

  ws.on("message", (data) => {
    console.debug(data);
    const {
      action,
      stubConnectionId,
      debugRequestId,
      debugRequestExpireAt,
      debugRequestTimeoutInMs,
      debugSrcPath,
      debugSrcHandler,
      event,
      context,
    } = JSON.parse(data);
    console.log("INFO", debugRequestId, "REQUEST", JSON.stringify(event));
    if (action !== "newRequest" || debugRequestExpireAt < Date.now()) {
      console.log("INFO", debugRequestId, "DISCARDED");
      return;
    }
    //delete require.cache[require.resolve('./lambda/handler')];
    //const handler = require('./lambda/handler');
    //const response = handler.main();
    //const srcEntry = props && props.entry
    //  || path.basename(__filename).split('.').splice(-1, 0,'id').join('.');
    //const srcHandler = props && props.handler || 'handler';

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
      { stdio: ["inherit", "inherit", "inherit", "ipc"], cwd: paths.appPath }
    );
    const timer = setTimer(lambda, handleResponse, debugRequestTimeoutInMs);

    function handleResponse(response) {
      switch (response.type) {
        case "success":
        case "failure":
          lambdaResponse = response;
          break;
        default:
      }
    }

    function returnLambdaResponse() {
      console.log(
        "INFO",
        debugRequestId,
        "RESPONSE",
        JSON.stringify(lambdaResponse)
      );
      ws.send(
        JSON.stringify({
          action: "newResponse",
          debugRequestId,
          stubConnectionId,
          response: lambdaResponse.data,
        })
      );
    }

    lambda.on("message", handleResponse);
    lambda.on("exit", function () {
      returnLambdaResponse();
      clearTimeout(timer);
    });
  });
}

module.exports = async function (argv, config, cliInfo) {
  const region = "us-east-1";
  const stage = "local";
  const stack = `${stage}-debug-stack`;

  // Deploy debug stack
  execSync("npx cdk deploy --require-approval never", {
    stdio: ["inherit", "inherit", "inherit"],
    cwd: `${paths.ownPath}/scripts/debug`,
  });

  // Get websocket endpoint
  const cf = new AWS.CloudFormation({ region });
  const cfRet = await cf.describeStacks({ StackName: stack }).promise();
  const debugEndpoint = cfRet.Stacks[0].Outputs.find(
    (output) => output.OutputKey === "Endpoint"
  ).OutputValue;
  process.env.SST_DEBUG_ENDPOINT = debugEndpoint;

  // Deploy app
  await deploy(argv, config, cliInfo);

  // Start client
  startClient(debugEndpoint);
};
