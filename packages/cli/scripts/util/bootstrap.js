/**
 * Based on https://github.com/lambci/node-custom-lambda/blob/0e3f2133bb2b667fa29aa4adfc30fab22166f6e4/v10.x/bootstrap.js
 */
"use strict";

require("source-map-support").install();

process.on("unhandledRejection", (err) => {
  throw err;
});

const path = require("path");
const fetch = require("node-fetch");
const { getChildLogger, initializeLogger } = require("@serverless-stack/core");
const { serializeError } = require("../../lib/serializeError");

const CALLBACK_USED = Symbol("CALLBACK_USED");
const CALLBACK_IS_INVOKING = Symbol("CALLBACK_IS_INVOKING");
const ASYNC_HANDLER = Symbol("ASYNC_HANDLER");
const EXIT_ON_CALLBACK = Symbol("EXIT_ON_CALLBACK");

const argv = process.argv.slice(2);

let EVENT;
let CONTEXT;
let TIMEOUT_AT;
const TASK_ROOT = argv[0];
const HANDLER = argv[1];
const ORIG_HANDLER_PATH = argv[2];
const APP_BUILD_PATH = argv[3];

// Configure logger
initializeLogger(APP_BUILD_PATH);
const logger = getChildLogger("lambda");

start();

async function start() {
  let handler;

  try {
    await fetchRequest();
    handler = getHandler();
  } catch (e) {
    logger.debug("caught getHandler error");
    return invokeErrorAndExit(e);
  }

  processEvents(handler);
}

async function fetchRequest() {
  logger.debug("fetchRequest");

  const url = `http://${process.env.AWS_LAMBDA_RUNTIME_API}/2018-06-01/runtime/invocation/next`;
  const response = await fetch(url);
  const headers = response.headers.raw();
  EVENT = await response.json();
  CONTEXT = {
    invokedFunctionArn: headers["lambda-runtime-invoked-function-arn"],
    awsRequestId: headers["lambda-runtime-aws-request-id"],
    identity: JSON.parse(headers["lambda-runtime-cognito-identity"]),
    clientContext: JSON.parse(headers["lambda-runtime-client-context"]),
  };
  TIMEOUT_AT = headers["lambda-runtime-deadline-ms"];
}

async function processEvents(handler) {
  logger.debug("processEvents");

  // Behavior of real Lambda functions with ASYNC handler:
  // - on function return, the execution is done;
  // - callbackWaitsForEmptyEventLoop is NOT used
  //
  // Behavior of real Lambda functions with SYNC handler:
  // - if function returned + callback called => callback value
  // - if function returned + callback NOT called => null
  // - if function returned + callback will call => wait + callback value
  // - if function returned + callback called + pending event loop
  //    + callbackWaitsForEmptyEventLoop TRUE => wait + callback value
  // - if function returned + callback called + pending event loop
  //    + callbackWaitsForEmptyEventLoop FALSE => callback value

  let result;
  try {
    result = await handler(EVENT, CONTEXT);
  } catch (e) {
    logger.debug("processEvents caught error");
    return invokeErrorAndExit(e);
  }

  // async handler
  if (CONTEXT[ASYNC_HANDLER] === true) {
    logger.debug("processEvents async handler => exit 0");
    return invokeResponse(result, () => process.exit(0));
  }

  // sync handler w/ callback called
  else if (CONTEXT[CALLBACK_USED] === true) {
    logger.debug("processEvents sync handler + callback used");

    // not waiting for event loop => exit
    if (CONTEXT.callbackWaitsForEmptyEventLoop === false) {
      // Handle the case where callback was invoked, but it is still sending
      // response to the parent process because process.send() is async. If
      // this is the case, we will exit after the sending is completed.
      if (CONTEXT[CALLBACK_IS_INVOKING]) {
        logger.debug(
          "callbackWaitsForEmptyEventLoop false => set EXIT_ON_CALLBACK"
        );
        CONTEXT[EXIT_ON_CALLBACK] = true;
      } else {
        logger.debug("callbackWaitsForEmptyEventLoop false => exit 0");
        process.exit(0);
      }
    } else {
      logger.debug("callbackWaitsForEmptyEventLoop true");
    }
  }

  // sync handler w/ callback NOT called
  // ie. setTimeout(() => callback(..), 1000)
  else {
    logger.debug("processEvents sync handler + callback NOT used");

    // The handler function is not async, and the callback has NOT been called. We will send back
    // a null response first, in the case the callback never gets called.
    // ie. Lambda would return a null response for a sync handler if the callback does not get called.
    invokeResponse(null);

    // callback has not been called, exit when it gets called
    if (CONTEXT.callbackWaitsForEmptyEventLoop === false) {
      logger.debug("callbackWaitsForEmptyEventLoop false");
      CONTEXT[EXIT_ON_CALLBACK] = true;
    } else {
      logger.debug("callbackWaitsForEmptyEventLoop true");
    }
  }
}

function getHandler() {
  logger.debug("getHandler");

  const app = require(path.resolve(TASK_ROOT));
  const handlerName = HANDLER;
  const userHandler = app[handlerName];
  const origHandlerPath = ORIG_HANDLER_PATH;

  if (userHandler == null) {
    logger.debug("getHandler missing");
    throw new Error(`Handler "${handlerName}" missing in "${origHandlerPath}"`);
  } else if (typeof userHandler !== "function") {
    logger.debug("getHandler not function");
    throw new Error(
      `Handler "${handlerName}" in "${origHandlerPath}" is not a function`
    );
  }

  return (event, context) =>
    new Promise((resolve, reject) => {
      context.succeed = resolve;
      context.fail = reject;
      context.done = (err, data) => (err ? reject(err) : resolve(data));
      context.getRemainingTimeInMillis = () => TIMEOUT_AT - Date.now();

      const callback = (err, data) => {
        logger.debug("callback called");
        logger.debug("callback error", err);
        logger.debug("callback data", data);

        context[CALLBACK_USED] = true;
        context.done(err, data);

        context[CALLBACK_IS_INVOKING] = true;
        invokeResponse(data, () => {
          context[CALLBACK_IS_INVOKING] = false;

          // EXIT_ON_CALLBACK is called when the handler has returned, but callback
          // has not been called. Also the callbackWaitsForEmptyEventLoop is set
          // to FALSE
          if (context[EXIT_ON_CALLBACK] === true) {
            logger.debug("callback EXIT_ON_CALLBACK set => exit 0");
            process.exit(0);
          }
        });
      };

      logger.debug("runHandler");

      let result;
      try {
        result = userHandler(event, context, callback);
      } catch (e) {
        return reject(e);
      }
      // returned a Promise
      if (result != null && typeof result.then === "function") {
        context[ASYNC_HANDLER] = true;
        result.then(resolve, reject);
      }
      // returned a non-Promise
      else {
        return resolve();
      }
    });
}

function invokeResponse(result, cb) {
  const ts = Date.now();
  logger.debug(`invokeResponse [${ts}] started`, result);
  process.send(
    {
      type: "success",
      data: result === undefined ? null : result,
    },
    () => {
      logger.debug(`invokeResponse [${ts}] completed`);
      cb && cb();
    }
  );
}

function invokeErrorAndExit(err) {
  const ts = Date.now();
  logger.debug(`invokeError [${ts}] started`, err);
  process.send(
    {
      type: "failure",
      error: serializeError(err),
    },
    () => {
      logger.debug(`invokeError [${ts}] completed`);
      process.exit(1);
    }
  );
}
