/**
 * Based on https://github.com/lambci/node-custom-lambda/blob/0e3f2133bb2b667fa29aa4adfc30fab22166f6e4/v10.x/bootstrap.js
 */
"use strict";

process.on("unhandledRejection", (err) => {
  throw err;
});

const path = require("path");

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

  tryProcessEvents(handler);
}

async function tryProcessEvents(handler) {
  try {
    await processEvents(handler);
  } catch (e) {
    invokeError(e);
    return process.exit(1);
  }
}

async function processEvents(handler) {
  const timer = getTimer();

  let result;

  try {
    result = await handler(EVENT, CONTEXT);
    invokeResponse(result);
  } catch (e) {
    invokeError(e);
  }

  clearTimeout(timer);
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
      if (result != null && typeof result.then === "function") {
        result.then(resolve, reject);
      }
    });
}

function getTimer() {
  return setTimeout(function () {
    invokeError({ name: "timeout", message: "Lambda timed out", stack: null });
    process.exit(1);
  }, CONTEXT.timeoutMs);
}

function invokeResponse(result) {
  process.send({ type: "success", data: result === undefined ? null : result });
}

function invokeError(err) {
  const { name, message, stack } = err;
  process.send({
    type: "failure",
    data: {
      errorType: name || typeof err,
      errorMessage: message || "" + err,
      stackTrace: (stack || "").split("\n").slice(1),
    },
  });
}
