import express from "express";
import spawn from "cross-spawn";
import path from "path";
import { ChildProcess } from "child_process";
import { getChildLogger } from "../logger";
import crypto from "crypto";
import { serializeError } from "./error";
import { v4 } from "uuid";

const logger = getChildLogger("client");

import * as Runner from "./runner";

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
  function: Runner.Opts;
  payload: Payload;
  env: Record<string, string>;
};

type ResponseSuccess = {
  type: "success";
  data: any;
};
type ResponseTimeout = {
  type: "timeout";
};
type ResponseFailure = {
  type: "failure";
  error: Error;
  rawError: any;
};

type Response = ResponseSuccess | ResponseFailure | ResponseTimeout;

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
    data: string;
  }>();

  public onStdErr = new EventDelegate<{
    requestId: string;
    data: string;
  }>();

  constructor(opts: ServerOpts) {
    this.app = express();
    this.app.use(
      express.json({
        strict: false,
        type: ["application/json", "application/*+json"],
        limit: "10mb",
      })
    );
    this.opts = opts;

    this.app.post<{
      fun: string;
      proc: string;
    }>(`/:proc/:fun/${API_VERSION}/runtime/init/error`, async (_req, res) => {
      res.json("ok");
    });

    this.app.get<{
      fun: string;
      proc: string;
    }>(
      `/:proc/:fun/${API_VERSION}/runtime/invocation/next`,
      async (req, res) => {
        logger.debug("Worker waiting for function", req.params.fun);
        const payload = await this.next(req.params.fun);
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
      (req, res) => {
        logger.debug(
          "Received error for",
          req.params.awsRequestId,
          req.params.fun
        );
        this.response(req.params.fun, req.params.awsRequestId, {
          type: "failure",
          error: serializeError({
            name: req.body.errorType,
            message: req.body.errorMessage,
            stack: req.body.trace,
          }),
          rawError: req.body,
        });
        res.status(202).send();
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

  private async next(fun: string) {
    const pool = this.pool(fun);

    // Process pending payloads if any
    const pending = pool.pending.pop();
    if (pending) return pending;

    return new Promise<Payload>((resolve) => {
      pool.waiting.push(resolve);
    });
  }

  public async invoke(opts: InvokeOpts) {
    const fun = Server.generateFunctionID(opts.function);
    const pool = this.pool(fun);
    return new Promise((resolve) => {
      pool.requests[opts.payload.context.awsRequestId] = resolve;
      this.trigger(fun, opts);
    });
  }

  public async drain(opts: Runner.Opts) {
    const fun = Server.generateFunctionID(opts);
    logger.debug("Draining function", fun);
    const pool = this.pool(fun);
    for (const proc of pool.processes) {
      proc.kill();
    }
    pool.waiting = [];
    pool.processes = [];
  }

  private static generateFunctionID(opts: Runner.Opts) {
    return crypto
      .createHash("sha256")
      .update(path.normalize(opts.srcPath))
      .digest("hex")
      .substr(0, 8);
  }

  public response(fun: string, request: string, response: Response) {
    const pool = this.pool(fun);
    const r = pool.requests[request];
    if (!r) return;
    delete pool.requests[request];
    r(response);
  }

  private async trigger(fun: string, opts: InvokeOpts) {
    logger.debug("Triggering", fun);
    const pool = this.pool(fun);
    const w = pool.waiting.pop();
    if (w) return w(opts.payload);
    // Spawn new worker if one not immediately available
    pool.pending.push(opts.payload);
    const cmd = Runner.resolve(opts.function.runtime)(opts.function);
    const id = v4();
    const api = `127.0.0.1:${this.opts.port}/${id}/${fun}`;
    const env = {
      ...opts.env,
      ...cmd.env,
      AWS_LAMBDA_RUNTIME_API: api,
      IS_LOCAL: "true",
    };
    logger.debug("Spawning", id, cmd.command);
    const proc = spawn(cmd.command, cmd.args, {
      env,
    });
    proc.stdout!.on("data", (data) =>
      this.onStdOut.trigger({
        data: data.toString(),
        requestId: this.lastRequest[id],
      })
    );
    proc.stderr!.on("data", (data) =>
      this.onStdErr.trigger({
        data: data.toString(),
        requestId: this.lastRequest[id],
      })
    );
    pool.processes.push(proc);
  }
}

type Pool = {
  waiting: ((p: Payload) => void)[];
  requests: Record<string, (any: Response) => void>;
  pending: Payload[];
  processes: ChildProcess[];
};
