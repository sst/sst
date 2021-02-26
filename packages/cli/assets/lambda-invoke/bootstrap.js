/**
 * Based on https://github.com/lambci/node-custom-lambda/blob/0e3f2133bb2b667fa29aa4adfc30fab22166f6e4/v10.x/bootstrap.js
 */
"use strict";

require("source-map-support").install();

process.on("unhandledRejection", (err) => {
  throw err;
});

const path = require("path");
const { serializeError } = require("../../lib/serializeError");

const CALLBACK_USED = Symbol("CALLBACK_USED");
const ASYNC_HANDLER = Symbol("ASYNC_HANDLER");
const EXIT_ON_CALLBACK = Symbol("EXIT_ON_CALLBACK");

const argv = process.argv.slice(2);

const EVENT = JSON.parse(argv[0]);
const CONTEXT = JSON.parse(argv[1]);
const TIMEOUT_AT = parseInt(argv[2]);
const TASK_ROOT = argv[3];
const HANDLER = argv[4];
const ORIG_HANDLER_PATH = argv[5];

start();

async function start() {
  let handler;

  try {
    handler = getHandler();
  } catch (e) {
    invokeError(e);
    return process.exit(1);
  }

  processEvents(handler);
}

async function processEvents(handler) {
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

  try {
    const result = await handler(EVENT, CONTEXT);
    invokeResponse(result);
  } catch (e) {
    invokeError(e);
    return process.exit(1);
  }

  // async handler
  if (CONTEXT[ASYNC_HANDLER] === true) {
    process.exit(0);
  }

  // sync handler
  if (CONTEXT[CALLBACK_USED] === true) {
    // not waiting for event loop => exit
    if (CONTEXT.callbackWaitsForEmptyEventLoop === false) {
      process.exit(0);
    }
  } else {
    // callback has not been called, exit when it gets called
    if (CONTEXT.callbackWaitsForEmptyEventLoop === false) {
      CONTEXT[EXIT_ON_CALLBACK] = true;
    }
  }
}

function getHandler() {
  const app = require(path.resolve(TASK_ROOT));
  const handlerName = HANDLER;
  const userHandler = app[handlerName];
  const origHandlerPath = ORIG_HANDLER_PATH;

  if (userHandler == null) {
    throw new Error(`Handler "${handlerName}" missing in "${origHandlerPath}"`);
  } else if (typeof userHandler !== "function") {
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
        invokeResponse(data);
        context[CALLBACK_USED] = true;
        context.done(err, data);

        // EXIT_ON_CALLBACK is called when the handler has returned, but callback
        // has not been called. Also the callbackWaitsForEmptyEventLoop is set
        // to FALSE
        if (context[EXIT_ON_CALLBACK] === true) {
          process.exit(0);
        }
      };

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
      // ie. The handler function is not async, and the user returned instead of calling
      //     the callback. Lambda would return a null response, we need to return the same.
      else {
        return resolve(null);
      }
    });
}

function invokeResponse(result) {
  process.send({ type: "success", data: result === undefined ? null : result });
}

function invokeError(err) {
  process.send({
    type: "failure",
    error: serializeError(err),
  });
}
