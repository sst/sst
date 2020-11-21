"use strict";

const spawn = require("cross-spawn");

const paths = require("./config/paths");

const handler = "hello.handler";

const context = {
  awsRequestId: "123",
  invokedFunctionArn: "123",
  logGroupName: "123",
  logStreamName: "123",
  functionName: "123",
  functionVersion: "123",
  memoryLimitInMB: 1024,
  // Get calculated timeout
  timeoutInMs: 4000,
  //getRemainingTimeInMillis: () => deadlineMs - Date.now(),
  callbackWaitsForEmptyEventLoop: true,
  clientContext: {},
  identity: {},
};

const event = {
  body: "Hello World",
};

// From Lambda /var/runtime/bootstrap
// https://link.medium.com/7ir11kKjwbb
const newSpace = Math.floor(context.memoryLimitInMB / 10);
const semiSpace = Math.floor(newSpace / 2);
const oldSpace = context.memoryLimitInMB - newSpace;

function setTimer(lambda, handleResponse) {
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
  }, context.timeoutInMs);
}

module.exports = async function () {
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
      "./src", // Local path to the Lambda functions
      handler,
    ],
    { stdio: ["inherit", "inherit", "inherit", "ipc"], cwd: paths.appPath }
  );
  const timer = setTimer(lambda, handleResponse);

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
    console.log("Done", lambdaResponse);
  }

  lambda.on("message", handleResponse);
  lambda.on("exit", function () {
    returnLambdaResponse();
    clearTimeout(timer);
  });
};
