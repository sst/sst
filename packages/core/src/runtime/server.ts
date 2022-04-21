import express from "express";
import spawn from "cross-spawn";
import { ChildProcess } from "child_process";
import { getChildLogger } from "../logger.js";
import { v4 } from "uuid";
import https from "https";
import url from "url";

const logger = getChildLogger("runtime");

import { Handler } from "./handler/index.js";

const API_VERSION = "2018-06-01";

type ServerOpts = {
  port: number;
};

type Payload = {
  event: any;
  context: any;
  deadline: number;
};

type InvokeOpts = {
  function: Handler.Opts;
  payload: Payload;
  env: Record<string, string>;
};

export type ResponseSuccess = {
  type: "success";
  data: any;
};

export type ResponseTimeout = {
  type: "timeout";
};

export type ResponseFailure = {
  type: "failure";
  error: {
    errorType: string;
    errorMessage: string;
    stackTrace: string[];
  };
};

export type Response = ResponseSuccess | ResponseFailure | ResponseTimeout;

type EventHandler<T> = (arg: T) => void;

class EventDelegate<T> {
  private handlers: EventHandler<T>[] = [];

  public add(handler: EventHandler<T>) {
    this.handlers.push(handler);
    return handler;
  }

  public remove(handler: EventHandler<T>) {
    this.handlers = this.handlers.filter((h) => h !== handler);
  }

  public trigger(input: T) {
    for (const h of this.handlers) {
      h(input);
    }
  }
}

export class Server {
  private readonly app: express.Express;
  private readonly pools: Record<string, Pool> = {};
  private readonly opts: ServerOpts;
  private readonly lastRequest: Record<string, string> = {};

  public onStdOut = new EventDelegate<{
    requestId: string;
    funcId: string;
    data: string;
  }>();

  public onStdErr = new EventDelegate<{
    requestId: string;
    funcId: string;
    data: string;
  }>();

  constructor(opts: ServerOpts) {
    this.app = express();
    this.opts = opts;

    this.app.post<{
      fun: string;
      proc: string;
    }>(
      `/:proc/:fun/${API_VERSION}/runtime/init/error`,
      express.json({
        strict: false,
        type: ["application/json", "application/*+json"],
        limit: "10mb",
      }),
      async (req, res) => {
        this.response(req.params.fun, this.lastRequest[req.params.proc], {
          type: "failure",
          error: req.body,
        });
        res.json("ok");
      }
    );

    this.app.get<{
      fun: string;
      proc: string;
    }>(
      `/:proc/:fun/${API_VERSION}/runtime/invocation/next`,
      async (req, res) => {
        logger.debug("Worker waiting for function", req.params.fun);
        const payload = await this.next(req.params.proc, req.params.fun);
        logger.debug(
          "Sending next payload",
          payload.context.awsRequestId,
          req.params.fun,
          payload.event
        );
        res.set({
          "Lambda-Runtime-Aws-Request-Id": payload.context.awsRequestId,
          "Lambda-Runtime-Deadline-Ms": payload.deadline,
          "Lambda-Runtime-Invoked-Function-Arn":
            payload.context.invokedFunctionArn,
          "Lambda-Runtime-Client-Context": JSON.stringify(
            payload.context.identity || {}
          ),
          "Lambda-Runtime-Cognito-Identity": JSON.stringify(
            payload.context.clientContext || {}
          ),
        });
        this.lastRequest[req.params.proc] = payload.context.awsRequestId;
        res.json(payload.event);
      }
    );

    this.app.post<{
      fun: string;
      proc: string;
      awsRequestId: string;
    }>(
      `/:proc/:fun/${API_VERSION}/runtime/invocation/:awsRequestId/response`,
      express.json({
        strict: false,
        type: ["application/json", "application/*+json"],
        limit: "10mb",
      }),
      (req, res) => {
        logger.debug(
          "Received response for",
          req.params.awsRequestId,
          req.params.fun
        );
        this.response(req.params.fun, req.params.awsRequestId, {
          type: "success",
          data: req.body,
        });
        res.status(202).send();
      }
    );

    this.app.post<{
      fun: string;
      proc: string;
      awsRequestId: string;
    }>(
      `/:proc/:fun/${API_VERSION}/runtime/invocation/:awsRequestId/error`,
      express.json({
        strict: false,
        type: ["application/json", "application/*+json"],
        limit: "10mb",
      }),
      (req, res) => {
        logger.debug(
          "Received error for",
          req.params.awsRequestId,
          req.params.fun
        );
        this.response(req.params.fun, req.params.awsRequestId, {
          type: "failure",
          error: {
            errorType: req.body.errorType,
            errorMessage: req.body.errorMessage,
            stackTrace: req.body.trace,
          },
        });
        res.status(202).send();
      }
    );

    this.app.all<{
      href: string;
    }>(
      `/proxy*`,
      express.raw({
        type: "*/*",
        limit: "1024mb",
      }),
      (req, res) => {
        res.header("Access-Control-Allow-Origin", "*");
        res.header(
          "Access-Control-Allow-Methods",
          "GET, PUT, PATCH, POST, DELETE"
        );
        res.header(
          "Access-Control-Allow-Headers",
          req.header("access-control-request-headers")
        );

        if (req.method === "OPTIONS") return res.send();
        const u = new url.URL(req.url.substring(7));
        const forward = https.request(
          u,
          {
            headers: {
              ...req.headers,
              host: u.hostname,
            },
            method: req.method,
          },
          (proxied) => {
            res.status(proxied.statusCode!);
            for (const [key, value] of Object.entries(proxied.headers)) {
              res.header(key, value);
            }
            proxied.pipe(res);
          }
        );
        if (
          req.method !== "GET" &&
          req.method !== "DELETE" &&
          req.method !== "HEAD" &&
          req.body
        )
          forward.write(req.body);
        forward.end();
        forward.on("error", (e) => {
          logger.error(e.message);
        });
      }
    );
  }

  listen() {
    logger.debug("Starting runtime server on port:", this.opts.port);
    this.app.listen({
      port: this.opts.port,
    });
  }

  private pool(fun: string) {
    const result = this.pools[fun] || {
      pending: [],
      waiting: [],
      processes: [],
      requests: {},
      working: {},
    };
    this.pools[fun] = result;
    return result;
  }

  private async next(proc: string, fun: string) {
    const pool = this.pool(fun);

    // Process pending payloads if any
    const pending = pool.pending.pop();
    if (pending) return pending;

    return new Promise<Payload>((resolve) => {
      pool.waiting[proc] = resolve;
    });
  }

  public async invoke(opts: InvokeOpts) {
    return this.trigger(opts);
  }

  public async drain(opts: Handler.Opts) {
    const fun = Server.generateFunctionID(opts);
    logger.debug("Draining function", fun);
    const pool = this.pool(fun);
    for (const proc of pool.processes) {
      proc.kill();
    }
    pool.waiting = {};
    pool.processes = [];
  }

  private static generateFunctionID(opts: Handler.Opts) {
    return opts.id;
  }

  public response(fun: string, request: string, response: Response) {
    const pool = this.pool(fun);
    const r = pool.requests[request];
    if (!r) return;
    delete pool.requests[request];
    r(response);
  }

  public isWarm(id: string) {
    return this.warm[id];
  }

  private warm: Record<string, true> = {};
  private async trigger(opts: InvokeOpts): Promise<Response> {
    logger.debug("Triggering", opts.function);
    const pool = this.pool(opts.function.id);

    // Check if invoked before
    if (!this.isWarm(opts.function.id)) {
      logger.debug("First build...");
      const results = await Handler.build(opts.function);
      if (results && results.length > 0) {
        return {
          type: "failure",
          error: {
            errorType: "build_failure",
            errorMessage: `The function ${opts.function.handler} failed to build`,
            stackTrace: [],
          },
        };
      }
      this.warm[opts.function.id] = true;
      logger.debug("First build finished");
    }

    return new Promise<Response>((resolve) => {
      pool.requests[opts.payload.context.awsRequestId] = resolve;
      const [key] = Object.keys(pool.waiting);
      if (key) {
        const w = pool.waiting[key];
        delete pool.waiting[key];
        w(opts.payload);
        return;
      }

      // Spawn new worker if one not immediately available
      pool.pending.push(opts.payload);
      const id = v4();
      this.lastRequest[id] = opts.payload.context.awsRequestId;
      const instructions = Handler.resolve(opts.function.runtime)(
        opts.function
      );
      const api = `127.0.0.1:${this.opts.port}/${id}/${opts.function.id}`;
      const env = {
        ...opts.env,
        ...instructions.run.env,
        AWS_LAMBDA_RUNTIME_API: api,
        // Required by Lambda context
        AWS_LAMBDA_FUNCTION_NAME: opts.payload.context.functionName,
        AWS_LAMBDA_FUNCTION_MEMORY_SIZE: opts.payload.context.memoryLimitInMB,
        // Disable X-Ray in local development. Otherwise, if the AWS SDK in
        // user's function code has X-Ray enabled, it will result in error:
        // "Error: Failed to get the current sub/segment from the context."
        AWS_XRAY_LOG_LEVEL: "silent",
        AWS_XRAY_CONTEXT_MISSING: "LOG_ERROR",
        IS_LOCAL: "true",
      };
      logger.debug("Spawning", instructions.run);
      const proc = spawn(instructions.run.command, instructions.run.args, {
        env,
      });
      proc.stdout!.on("data", (data) => {
        this.onStdOut.trigger({
          data: data.toString(),
          funcId: opts.function.id,
          requestId: this.lastRequest[id],
        });
      });
      proc.stderr!.on("data", (data) => {
        this.onStdErr.trigger({
          data: data.toString(),
          funcId: opts.function.id,
          requestId: this.lastRequest[id],
        });
      });
      proc.on("exit", () => {
        pool.processes = pool.processes.filter((p) => p !== proc);
        delete pool.waiting[id];
      });
      pool.processes.push(proc);
    });
  }
}

type Pool = {
  waiting: Record<string, (p: Payload) => void>;
  requests: Record<string, (any: Response) => void>;
  pending: Payload[];
  processes: ChildProcess[];
};
