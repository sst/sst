const WebSocket = require("ws");
let ws;
let wsCallbackRef = {};

exports.main = function (event, context, callback) {
  context.callbackWaitsForEmptyEventLoop = false;

  const {
    functionName,
    memoryLimitInMB,
    awsRequestId,
    callbackWaitsForEmptyEventLoop,
  } = context;
  const debugRequestExpireAt =
    Date.now() + context.getRemainingTimeInMillis() + 1000;
  const debugRequestId = `${awsRequestId}-${debugRequestExpireAt}`;

  // Set debugRequestId in ref b/c debugRequestId will be used in callback, need to do the
  // useRef trick to let the callback access its current value.
  wsCallbackRef.debugRequestId = debugRequestId;
  wsCallbackRef.callback = callback;

  // Connection closed cases
  // - closed while waiting for response + idle longer than 10min => send keep-alive after 9min
  // - closed while waiting for response + 2hr connection limit => ?
  // - closed while not waiting + idle longer than 10min => ?
  // - closed while not waiting + 2hr connection limit => ?

  // Set timer to send keep-alive message if still waiting for response after 9 minutes
  let wsKeepAliveTimer;

  if (!ws) {
    connect(() => {
      sendMessage();
    });
  } else {
    sendMessage();
  }

  function connect(connectCallback = undefined) {
    ws = new WebSocket(process.env.SST_DEBUG_ENDPOINT);

    ws.on("open", () => {
      console.log("opened");
      if (connectCallback) {
        connectCallback();
      }
    });

    ws.on("close", () => {
      console.log("closed");
    });

    ws.on("message", (data) => {
      receiveMessage(data);
    });

    ws.on("error", () => {
      console.log("error");
    });
  }

  function sendMessage() {
    ws.send(
      JSON.stringify({
        action: "newRequest",
        debugRequestId,
        debugRequestExpireAt,
        debugRequestTimeoutInMs: context.getRemainingTimeInMillis(),
        debugSrcPath: process.env.SST_DEBUG_SRC_PATH,
        debugSrcHandler: process.env.SST_DEBUG_SRC_HANDLER,
        event,
        context: {
          functionName,
          memoryLimitInMB,
          awsRequestId,
          callbackWaitsForEmptyEventLoop,
        },
        env: constructEnvs(),
      })
    );
    console.log("request sent");

    // Start timer
    wsKeepAliveTimer = setTimeout(function () {
      ws.send(JSON.stringify({ action: "keepalive" }));
      console.log("sent keepalive message");
    }, 540000);
  }

  function receiveMessage(data) {
    console.log("response received", { data });
    const { action, debugRequestId, responseData, responseError } = JSON.parse(
      data
    );
    if (action === "failedToSendRequestDueToClientNotConnected") {
      throw new Error("Debug client not connected.");
    }

    if (action === "failedToSendRequestDueToUnknown") {
      throw new Error("Failed to send request to debug client.");
    }

    if (
      action !== "newResponse" ||
      debugRequestId !== wsCallbackRef.debugRequestId
    ) {
      console.log("discard response");
      return;
    }

    // Stop timer
    if (wsKeepAliveTimer) {
      clearTimeout(wsKeepAliveTimer);
    }

    // Handle response error
    if (responseError) {
      throw deserializeError(responseError);
    }

    // Handle response data
    wsCallbackRef.callback(null, responseData);
  }

  function constructEnvs() {
    const envs = {};
    Object.keys(process.env)
      .filter(
        (key) =>
          ![
            // Include
            //
            //'AWS_REGION',
            //'AWS_DEFAULT_REGION',
            //'AWS_LAMBDA_FUNCTION_NAME',
            //'AWS_LAMBDA_FUNCTION_VERSION',
            //'AWS_ACCESS_KEY_ID',
            //'AWS_SECRET_ACCESS_KEY',
            //'AWS_SESSION_TOKEN',
            //
            // Exclude
            //
            "SST_DEBUG_ENDPOINT",
            "SST_DEBUG_SRC_HANDLER",
            "SST_DEBUG_SRC_PATH",
            "AWS_LAMBDA_FUNCTION_MEMORY_SIZE",
            "AWS_LAMBDA_LOG_GROUP_NAME",
            "AWS_LAMBDA_LOG_STREAM_NAME",
            "LD_LIBRARY_PATH",
            "LAMBDA_TASK_ROOT",
            "AWS_LAMBDA_RUNTIME_API",
            "AWS_EXECUTION_ENV",
            "AWS_XRAY_DAEMON_ADDRESS",
            "AWS_LAMBDA_INITIALIZATION_TYPE",
            "PATH",
            "PWD",
            "LAMBDA_RUNTIME_DIR",
            "LANG",
            "NODE_PATH",
            "TZ",
            "SHLVL",
            "_AWS_XRAY_DAEMON_ADDRESS",
            "_AWS_XRAY_DAEMON_PORT",
            "AWS_XRAY_CONTEXT_MISSING",
            "_HANDLER",
            "_X_AMZN_TRACE_ID",
          ].includes(key)
      )
      .forEach((key) => {
        envs[key] = process.env[key];
      });
    return envs;
  }
};

// Serialize error
// https://github.com/sindresorhus/serialize-error/blob/master/index.js
const commonProperties = [
  { property: "name", enumerable: false },
  { property: "message", enumerable: false },
  { property: "stack", enumerable: false },
  { property: "code", enumerable: true },
];

const destroyCircular = ({ from, seen, to_, forceEnumerable }) => {
  const to = to_ || (Array.isArray(from) ? [] : {});

  seen.push(from);

  for (const [key, value] of Object.entries(from)) {
    if (typeof value === "function") {
      continue;
    }

    if (!value || typeof value !== "object") {
      to[key] = value;
      continue;
    }

    if (!seen.includes(from[key])) {
      to[key] = destroyCircular({
        from: from[key],
        seen: seen.slice(),
        forceEnumerable,
      });
      continue;
    }

    to[key] = "[Circular]";
  }

  for (const { property, enumerable } of commonProperties) {
    if (typeof from[property] === "string") {
      Object.defineProperty(to, property, {
        value: from[property],
        enumerable: forceEnumerable ? true : enumerable,
        configurable: true,
        writable: true,
      });
    }
  }

  return to;
};

const deserializeError = (value) => {
  if (value instanceof Error) {
    return value;
  }

  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    const newError = new Error();
    destroyCircular({ from: value, seen: [], to_: newError });
    return newError;
  }

  return value;
};
