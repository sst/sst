/**
 * Based on https://github.com/lambci/node-custom-lambda/blob/0e3f2133bb2b667fa29aa4adfc30fab22166f6e4/v10.x/bootstrap.js
 */
"use strict";

require("source-map-support").install();

process.on("unhandledRejection", (err) => {
  throw err;
});

const path = require("path");
const { serializeError } = require("./serializeError");

const CALLBACK_USED = Symbol("CALLBACK_USED");

const argv = process.argv.slice(2);

const EVENT = JSON.parse(argv[0]);
const CONTEXT = JSON.parse(argv[1]);
const TASK_ROOT = argv[2];
const HANDLER = argv[3];

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
  try {
    const result = await handler(EVENT, CONTEXT);
    invokeResponse(result);
  } catch (e) {
    invokeError(e);
    return process.exit(1);
  }

  const callbackUsed = CONTEXT[CALLBACK_USED];

  if (callbackUsed && CONTEXT.callbackWaitsForEmptyEventLoop === false) {
    process.exit(0);
  }
}

function getHandler() {
  const appParts = HANDLER.split(".");

  if (appParts.length !== 2) {
    throw new Error(`Bad handler ${HANDLER}`);
  }

  const [modulePath, handlerName] = appParts;

  const app = require(path.resolve(TASK_ROOT, modulePath));

  const userHandler = app[handlerName];

  if (userHandler == null) {
    throw new Error(
      `Handler '${handlerName}' missing on module '${modulePath}'`
    );
  } else if (typeof userHandler !== "function") {
    throw new Error(
      `Handler '${handlerName}' from '${modulePath}' is not a function`
    );
  }

  return (event, context) =>
    new Promise((resolve, reject) => {
      context.succeed = resolve;
      context.fail = reject;
      context.done = (err, data) => (err ? reject(err) : resolve(data));

      const callback = (err, data) => {
        context[CALLBACK_USED] = true;
        context.done(err, data);
      };

      let result;
      try {
        result = userHandler(event, context, callback);
      } catch (e) {
        return reject(e);
      }
      // returned a Promise
      if (result != null && typeof result.then === "function") {
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
