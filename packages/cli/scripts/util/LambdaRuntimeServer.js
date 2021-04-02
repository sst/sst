"use strict";

const express = require('express');
const bodyParser = require('body-parser');
const { getChildLogger } = require("@serverless-stack/core");
const logger = getChildLogger("lambda-runtime-server");

const API_VERSION = '2018-06-01';

module.exports = class LambdaRuntimeServer {

  constructor() {
    this.requests = {};
  }

  start(port) {
    const app = express();
    app.use(bodyParser.json());

    app.get(`/:debugRequestId/${API_VERSION}/runtime/invocation/next`, (req, res) => {
      const debugRequestId = req.params.debugRequestId;
      logger.debug(debugRequestId, "/runtime/invocation/next");
      const { timeoutAt, event, context } = this.requests[debugRequestId];
      res.set({
        'Lambda-Runtime-Aws-Request-Id': context.awsRequestId,
        'Lambda-Runtime-Deadline-Ms': timeoutAt,
        'Lambda-Runtime-Invoked-Function-Arn': context.invokedFunctionArn,
        //'Lambda-Runtime-Trace-Id – The AWS X-Ray tracing header.
        'Lambda-Runtime-Client-Context': JSON.stringify(context.identity || {}),
        'Lambda-Runtime-Cognito-Identity': JSON.stringify(context.clientContext || {}),
      });
      res.json(event);
    })

    app.post(`/:debugRequestId/${API_VERSION}/runtime/invocation/:awsRequestId/response`, (req) => {
      const debugRequestId = req.params.debugRequestId;
      logger.debug(debugRequestId, "/runtime/invocation/:awsRequestId/response", req.body);
      const request = this.requests[debugRequestId];
      request.onSuccess(req.body);
    })

    app.post(`/:debugRequestId/${API_VERSION}/runtime/invocation/:awsRequestId/error`, (req) => {
      const debugRequestId = req.params.debugRequestId;
      logger.debug(debugRequestId, "/runtime/invocation/:awsRequestId/error", req.body);
      const request = this.requests[debugRequestId];
      request.onFailure(req.body);
    })

    app.post(`/:debugRequestId/${API_VERSION}/runtime/init/error`, (req) => {
      const debugRequestId = req.params.debugRequestId;
      logger.debug(debugRequestId, "/runtime/init/error", req.body);
      const request = this.requests[debugRequestId];
      request.onFailure(req.body);
    })

    app.listen(port);

    logger.debug("Lambda runtime server started");
  }

  addRequest({ debugRequestId, timeoutAt, event, context, onSuccess, onFailure }) {
    this.requests[debugRequestId] = { timeoutAt, event, context, onSuccess, onFailure };
  }

  removeRequest(debugRequestId) {
    delete this.requests[debugRequestId];
  }
}
