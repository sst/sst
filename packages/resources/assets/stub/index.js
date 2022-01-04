/**
 * Note: 4 cases where a websocket connection might be closed
 * 1. closed while waiting for response + idle longer than 10min => send keep-alive after 9min
 * 2. closed while waiting for response + 2hr connection limit => a new connection will be used
 * 3. closed while not waiting + idle longer than 10min => detect close callback and resend
 * 4. closed while not waiting + 2hr connection limit => a new connection will be used
 * 5. closed while connecting => do not retry
 *    ie. ENOTFOUND: debug stack is removed and the websocket endpoint does not exist.
 * 6. closed while sending message => do not retry
 *    ie. Code: 1009 Error: Max frame length of 32768 has been exceeded.
 */

const zlib = require("zlib");
const WebSocket = require("ws");
const AWS = require("aws-sdk");
AWS.config.logger = console;
const s3 = new AWS.S3();

// Set debugRequestId in ref b/c debugRequestId will be used in callback, need to do the
// useRef trick to let the callback access its current value.
let _ref = {
  ws: null,
  wsConnectedAt: 0,
  wsLastConnectError: null,
};

// a new connection will be created if current connection has established for the given lifespan
const CONNECTION_LIFESPAN = 1800000; // 30 minutes

exports.main = function (event, context, callback) {
  context.callbackWaitsForEmptyEventLoop = false;

  _ref.event = event;
  _ref.context = context;
  _ref.callback = callback;
  _ref.keepAliveTimer = null;
  _ref.debugRequestId = `${context.awsRequestId}-${Date.now()}`;

  // Case: Lambda first run, no websocket connection
  if (!_ref.ws) {
    connectAndSendMessage();
  }
  // Case: Lambda subsequent run, websocket connection EXCEEDED life span
  else if (Date.now() - _ref.wsConnectedAt >= CONNECTION_LIFESPAN) {
    disconnect();
    connectAndSendMessage();
  }
  // Case: Lambda subsequent run, websocket connection NOT exceeded life span
  else {
    sendMessage();
  }

  function connectAndSendMessage() {
    console.log("connectAndSendMessage()");
    _ref.ws = new WebSocket(process.env.SST_DEBUG_ENDPOINT);
    _ref.wsConnectedAt = Date.now();
    _ref.wsLastConnectError = null;

    _ref.ws.onopen = () => {
      console.log("ws.onopen");
      sendMessage();
    };

    _ref.ws.onclose = (e) => {
      // Note: review the 4 cases a connection could be closed:
      // 1. WILL NOT HAPPEN: b/c the connect is kept alive by keep-alive message
      // 2. WILL NOT HAPPEN: b/c a new connect is created, and existing connection is disconnected
      // 3. CAN HAPPEN: reconnect and resend message
      // 4. WILL NOT HAPPEN: b/c a new connect is created, and existing connection is disconnected
      console.log("ws.onclose", e.code, e.reason);

      // stop timer
      if (_ref.keepAliveTimer) {
        console.log("ws.onclose - stop keep alive timer", _ref.keepAliveTimer);
        clearTimeout(_ref.keepAliveTimer);
      }

      // Case 5: closed while connecting => do not retry
      // ie. ENOTFOUND: the websocket endpoint does not exist.
      if (
        _ref.wsLastConnectError &&
        _ref.wsLastConnectError.type === "error" &&
        _ref.wsLastConnectError.message.startsWith("getaddrinfo ENOTFOUND")
      ) {
        _ref.ws = undefined;
      }
      // Case 6: closed while sending message => do not retry
      // ie. Code: 1009 Error: Max frame length of 32768 has been exceeded.
      else if (e.code === 1009) {
        throw new Error(e.reason);
      }
      // Case 2 => retry
      else {
        connectAndSendMessage();
      }
    };

    _ref.ws.onmessage = (e) => {
      console.log("ws.onmessage", e.data);
      receiveMessage(e.data);
    };

    _ref.ws.onerror = (e) => {
      console.log("ws.onerror", e);
      _ref.wsLastConnectError = e;
    };
  }

  function disconnect() {
    console.log("disconnect()");
    _ref.ws.onopen = () => {
      console.log("ws.onopen (old connection)");
    };

    _ref.ws.onclose = (e) => {
      console.log("ws.onclose (old connection)", e.code, e.reason);
    };

    _ref.ws.onmessage = (e) => {
      console.log("ws.onmessage (old connection)", e);
    };

    _ref.ws.onerror = (e) => {
      console.log("ws.onerror (old connection)", e);
    };
    _ref.ws.close();
  }

  function sendMessage() {
    // Send message
    console.log("sendMessage() - send request");

    const { debugRequestId, context, event } = _ref;

    // Send payload in chunks to get around API Gateway 128KB limit
    const payload = zlib.gzipSync(
      JSON.stringify({
        functionId: process.env.SST_FUNCTION_ID,
        debugRequestTimeoutInMs: context.getRemainingTimeInMillis(),
        debugSrcPath: process.env.SST_DEBUG_SRC_PATH,
        debugSrcHandler: process.env.SST_DEBUG_SRC_HANDLER,
        event,
        // do not pass back:
        // - context.callbackWaitsForEmptyEventLoop (always set to false)
        context: {
          functionName: context.functionName,
          functionVersion: context.functionVersion,
          invokedFunctionArn: context.invokedFunctionArn,
          memoryLimitInMB: context.memoryLimitInMB,
          awsRequestId: context.awsRequestId,
          identity: context.identity,
          clientContext: context.clientContext,
        },
        env: constructEnvs(),
      })
    );
    const payloadBase64 = payload.toString("base64");

    // payload fits into 1 WebSocket frame (limit is 32KB)
    if (payloadBase64.length < 32000) {
      console.log(`sendMessage() - sending request via WebSocket`);
      _ref.ws.send(
        JSON.stringify({
          action: "stub.lambdaRequest",
          debugRequestId,
          payload: payloadBase64,
        })
      );
    }
    // payload does NOT fit into 1 WebSocket frame
    else {
      console.log(`sendMessage() - sending request via S3`);
      const s3Params = {
        Bucket: process.env.SST_DEBUG_BUCKET_NAME,
        Key: `payloads/${debugRequestId}-request`,
        Body: payload,
      };
      s3.upload(s3Params, (e) => {
        if (e) {
          console.log("Failed to upload payload to S3.");
          throw e;
        }

        _ref.ws.send(
          JSON.stringify({
            action: "stub.lambdaRequest",
            debugRequestId,
            payloadS3Key: s3Params.Key,
          })
        );
      });
    }

    // Start timer to send keep-alive message if still waiting for response after 9 minutes
    console.log("sendMessage() - start keep alive timer");
    _ref.keepAliveTimer = setTimeout(function () {
      _ref.ws.send(JSON.stringify({ action: "stub.keepAlive" }));
      console.log("sent keepAlive message");
    }, 540000);
  }

  async function receiveMessage(data) {
    console.log("receiveMessage()");
    const { action, debugRequestId, payload, payloadS3Key } = JSON.parse(data);

    // handle failed to send requests
    if (action === "server.failedToSendRequestDueToClientNotConnected") {
      const message = `Client not connected. Make sure "sst start" is running.`;
      if (process.env.SST_DEBUG_IS_API_ROUTE) {
        _ref.callback(null, {
          statusCode: 500,
          body: message,
        });
      }
      throw new Error(message);
    }
    if (action === "server.failedToSendRequestDueToUnknown") {
      throw new Error("Failed to send request to debug client.");
    }

    // handle invalid and expired response
    if (
      action !== "client.lambdaResponse" ||
      debugRequestId !== _ref.debugRequestId
    ) {
      console.log("receiveMessage() - discard response");
      return;
    }

    // decode payload
    let payloadData;
    if (payload) {
      console.log(`receiveMessage() - received payload`);
      payloadData = Buffer.from(payload, "base64");
    } else {
      console.log(`receiveMessage() - received payloadS3Key`);
      const s3Ret = await s3
        .getObject({
          Bucket: process.env.SST_DEBUG_BUCKET_NAME,
          Key: payloadS3Key,
        })
        .promise();
      payloadData = s3Ret.Body;
    }

    const { responseData, responseError, responseExitCode } = JSON.parse(
      zlib.unzipSync(payloadData).toString()
    );

    // stop timer
    if (_ref.keepAliveTimer) {
      console.log(
        "receiveMessage() - stop keep alive timer",
        _ref.keepAliveTimer
      );
      clearTimeout(_ref.keepAliveTimer);
    }

    // handle response error
    if (responseError) {
      // Note: Do not throw. If error is thrown, errorType becomes
      //       "Runtime.UnhandledPromiseRejection". We need to preserve the
      //       original error type.
      const e = new Error();
      e.name = responseError.errorType;
      e.message = responseError.errorMessage;
      e.stack = responseError.stackTrace.join("\n");
      _ref.callback(e);
    }

    // handle response exit code
    if (responseExitCode !== undefined) {
      process.exit(responseExitCode);
    }

    // handle response data
    _ref.callback(null, responseData);
  }
};

///////////////////////////////
// Util Functions
///////////////////////////////

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
          //'_X_AMZN_TRACE_ID',
          //
          // Exclude
          //
          "SST_DEBUG_ENDPOINT",
          "SST_DEBUG_SRC_HANDLER",
          "SST_DEBUG_SRC_PATH",
          "SST_FUNCTION_ID",
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
          "NODE_EXTRA_CA_CERTS",
          "TZ",
          "SHLVL",
          "_AWS_XRAY_DAEMON_ADDRESS",
          "_AWS_XRAY_DAEMON_PORT",
          "AWS_XRAY_CONTEXT_MISSING",
          "_HANDLER",
        ].includes(key)
    )
    .forEach((key) => {
      envs[key] = process.env[key];
    });
  return envs;
}
