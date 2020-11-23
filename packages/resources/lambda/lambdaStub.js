const WebSocket = require("ws");
let ws;
let wsCallbackRef = {};

// TODO
// - handle stub is idle for 10min and connection closes, need to check if closed event is received

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

  if (!ws) {
    connectAndSendMessage();
  } else {
    sendMessage();
  }

  function connectAndSendMessage() {
    ws = new WebSocket(process.env.SST_DEBUG_ENDPOINT);

    ws.on("open", () => {
      console.log("opened");
      sendMessage();
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
      })
    );
    console.log("request sent");
  }

  function receiveMessage(data) {
    console.log("response received", { data });
    const { action, debugRequestId, response } = JSON.parse(data);
    if (
      action !== "newResponse" ||
      debugRequestId !== wsCallbackRef.debugRequestId
    ) {
      console.log("discard response");
      return;
    }
    wsCallbackRef.callback(null, response);
  }
};
