import WebSocket from "ws";
import { EventDelegate } from "../events.js";
import { getChildLogger } from "../logger.js";
import S3 from "aws-sdk/clients/s3.js";
import zlib from "zlib";

const wsLogger = getChildLogger("websocket");

const WEBSOCKET_CLOSE_CODE = {
  NEW_CLIENT_CONNECTED: 4901,
} as const;

type SuccessMessage = {
  type: "success";
  body: any;
};

type FailureMessage = {
  type: "failure";
  body: {
    errorMessage: string;
    errorType: string;
    stackTrace: any[];
  };
};

type RequestHandler = (
  message: any
) => Promise<SuccessMessage | FailureMessage>;

type Message =
  | {
      action: "server.clientRegistered";
      clientConnectionId: string;
    }
  | {
      action: "server.clientDisconnectedDueToNewClient";
    }
  | {
      action: "server.failedToSendResponseDueToStubDisconnected";
    }
  | {
      action: "server.failedToSendResponseDueToUnknown";
    }
  | {
      action: "register";
      body: string;
    }
  | {
      action: "stub.lambdaRequest";
      [key: string]: any;
    };

export class WS {
  private s3?: S3;
  private socket?: WebSocket;
  private keepAlive?: NodeJS.Timeout;
  private debugBucketName?: string;
  private handleRequest?: RequestHandler;

  public onMessage = new EventDelegate<Message>();

  public onRequest(cb: RequestHandler) {
    this.handleRequest = cb;
  }

  public start(region: string, debugEndpoint: string, debugBucketName: string) {
    this.s3 = new S3({ region });
    this.debugBucketName = debugBucketName;
    wsLogger.debug("startWebSocketClient", debugEndpoint, debugBucketName);
    this.socket = new WebSocket(debugEndpoint);
    this.socket.on("open", () => {
      wsLogger.debug("WebSocket connection opened");
      this.send({ action: "client.register" });
      this.keepAlive = setInterval(() => this.sendKeepAlive(), 60000);
    });

    this.socket.on("error", (e) => {
      wsLogger.error("WebSocket connection error", e);
    });

    this.socket.on("close", (code, reason) => {
      wsLogger.debug("Websocket connection closed", { code, reason });

      // Stop keep-alive timer first to timer sending a keep alive call before
      // the reconnect is finished. Which will throw an exception.
      this.stop();

      // Case: disconnected due to new client connected => do not reconnect
      if (code === WEBSOCKET_CLOSE_CODE.NEW_CLIENT_CONNECTED) {
        wsLogger.debug(
          "Websocket connection closed due to new client connected"
        );
        return;
      }

      // Case: disconnected due to 10min idle or 2hr WebSocket connection limit => reconnect
      wsLogger.debug("Reconnecting to websocket server...");
      this.start(region, debugEndpoint, debugBucketName);
    });

    this.socket.on("message", (msg) => this.handleMessage(msg));
  }

  private async handleMessage(message: WebSocket.Data) {
    const data: Message = JSON.parse(message.toString());

    // Handle actions
    if (data.action === "server.clientRegistered") {
      this.onMessage.trigger(data);
      return;
    }

    if (data.action === "server.clientDisconnectedDueToNewClient") {
      this.onMessage.trigger(data);
      this.socket!.close(WEBSOCKET_CLOSE_CODE.NEW_CLIENT_CONNECTED);
      return;
    }

    if (data.action === "server.failedToSendResponseDueToStubDisconnected") {
      this.onMessage.trigger(data);
      return;
    }

    if (data.action === "server.failedToSendResponseDueToUnknown") {
      this.onMessage.trigger(data);
      return;
    }

    if (data.action === "register") {
      this.onMessage.trigger(data);
      return;
    }

    if (data.action === "stub.lambdaRequest") {
      if (!this.handleRequest) return;
      // Parse payload
      const { stubConnectionId, debugRequestId, payload, payloadS3Key } = data;
      const buffer = payload
        ? Buffer.from(payload, "base64")
        : ((
            await this.s3!.getObject({
              Bucket: this.debugBucketName!,
              Key: payloadS3Key,
            }).promise()
          ).Body! as Buffer);

      const req = JSON.parse(zlib.unzipSync(buffer).toString());
      const resp = await this.handleRequest(req);

      // Zipping payload
      const zipped = zlib.gzipSync(
        JSON.stringify(
          resp.type === "success"
            ? {
                responseData: resp.body,
              }
            : {
                responseError: resp.body,
              }
        )
      );

      if (zipped.length < 32000) {
        this.send({
          action: "client.lambdaResponse",
          debugRequestId,
          stubConnectionId,
          payload: zipped.toString("base64"),
        });
        return;
      }
      // payload does NOT fit into 1 WebSocket frame
      const uploaded = await this.s3!.upload({
        Bucket: this.debugBucketName!,
        Key: `payloads/${debugRequestId}-response`,
        Body: zipped,
      }).promise();
      this.send({
        action: "client.lambdaResponse",
        debugRequestId,
        stubConnectionId,
        payloadS3Key: uploaded.Key,
      });
    }
  }

  public stop() {
    if (this.keepAlive) clearInterval(this.keepAlive);
  }

  private sendKeepAlive() {
    this.send({ action: "client.keepAlive" });
  }

  private send(input: any) {
    this.socket?.send(JSON.stringify(input));
  }
}
