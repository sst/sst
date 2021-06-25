"use strict";

const chalk = require("chalk");
const isRoot = require("is-root");
const express = require("express");
const prompts = require("prompts");
const bodyParser = require("body-parser");
const detect = require("detect-port-alt");
const { getChildLogger } = require("@serverless-stack/core");
const logger = getChildLogger("lambda-runtime-server");

const API_VERSION = "2018-06-01";

module.exports = class LambdaRuntimeServer {
  constructor() {
    this.requests = {};
    this.host = null;
    this.port = null;
    this.server = null;
  }

  async start(host, defaultPort) {
    const port = await choosePort(host, defaultPort);
    this.host = host;
    this.port = port;

    const app = express();
    app.use(bodyParser.json());

    app.get(
      `/:debugRequestId/${API_VERSION}/runtime/invocation/next`,
      (req, res) => {
        const debugRequestId = req.params.debugRequestId;
        logger.debug(debugRequestId, "/runtime/invocation/next");
        const { timeoutAt, event, context } = this.requests[debugRequestId];
        res.set({
          "Lambda-Runtime-Aws-Request-Id": context.awsRequestId,
          "Lambda-Runtime-Deadline-Ms": timeoutAt,
          "Lambda-Runtime-Invoked-Function-Arn": context.invokedFunctionArn,
          //'Lambda-Runtime-Trace-Id – The AWS X-Ray tracing header.
          "Lambda-Runtime-Client-Context": JSON.stringify(
            context.identity || {}
          ),
          "Lambda-Runtime-Cognito-Identity": JSON.stringify(
            context.clientContext || {}
          ),
        });
        res.json(event);
      }
    );

    app.post(
      `/:debugRequestId/${API_VERSION}/runtime/invocation/:awsRequestId/response`,
      (req) => {
        const debugRequestId = req.params.debugRequestId;
        logger.debug(
          debugRequestId,
          "/runtime/invocation/:awsRequestId/response",
          req.body
        );
        const request = this.requests[debugRequestId];
        request.onSuccess(req.body);
      }
    );

    app.post(
      `/:debugRequestId/${API_VERSION}/runtime/invocation/:awsRequestId/error`,
      (req) => {
        const debugRequestId = req.params.debugRequestId;
        logger.debug(
          debugRequestId,
          "/runtime/invocation/:awsRequestId/error",
          req.body
        );
        const request = this.requests[debugRequestId];
        request.onFailure(req.body);
      }
    );

    app.post(`/:debugRequestId/${API_VERSION}/runtime/init/error`, (req) => {
      const debugRequestId = req.params.debugRequestId;
      logger.debug(debugRequestId, "/runtime/init/error", req.body);
      const request = this.requests[debugRequestId];
      request.onFailure(req.body);
    });

    this.server = app.listen(port);

    logger.debug("Lambda runtime server started");
  }

  stop() {
    this.server.close();
  }

  addRequest({
    debugRequestId,
    timeoutAt,
    event,
    context,
    onSuccess,
    onFailure,
  }) {
    this.requests[debugRequestId] = {
      timeoutAt,
      event,
      context,
      onSuccess,
      onFailure,
    };
  }

  removeRequest(debugRequestId) {
    delete this.requests[debugRequestId];
  }
};

// Code from create react app
// https://github.com/facebook/create-react-app/blob/master/packages/react-dev-utils/WebpackDevServerUtils.js#L448
function choosePort(host, defaultPort) {
  return detect(defaultPort, host).then(
    (port) =>
      new Promise((resolve) => {
        if (port === defaultPort) {
          return resolve(port);
        }
        const message =
          process.platform !== "win32" && defaultPort < 1024 && !isRoot()
            ? `Admin permissions are required to run a server on a port below 1024.`
            : `Something is already running on port ${defaultPort}.`;
        //clearConsole();
        const question = {
          type: "confirm",
          name: "shouldChangePort",
          message:
            chalk.cyan(message) +
            "\n\nWould you like to run the app on another port instead?",
          initial: true,
        };
        prompts(question).then((answer) => {
          if (answer.shouldChangePort) {
            resolve(port);
          } else {
            resolve(null);
          }
        });
      }),
    (err) => {
      throw new Error(
        chalk.red(`Could not find an open port at ${chalk.bold(host)}.`) +
          "\n" +
          ("Network error message: " + err.message || err) +
          "\n"
      );
    }
  );
}
