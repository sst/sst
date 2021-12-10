import express from "express";
import spawn from "cross-spawn";
import { ChildProcess } from "child_process";
import { getChildLogger } from "../logger";
import { v4 } from "uuid";

const logger = getChildLogger("client");

import { Handler } from "./handler";

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
          error: {
            errorType: req.body.errorType,
            errorMessage: req.body.errorMessage,
            stackTrace: req.body.trace,
          },
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
      try {
        logger.debug("First build...");
        await Handler.build(opts.function);
        this.warm[opts.function.id] = true;
        logger.debug("First build finished");
      } catch (ex) {
        return {
          type: "failure",
          error: {
            errorType: "build_failure",
            errorMessage: `The function ${opts.function.handler} failed to build`,
            stackTrace: [],
          },
        };
      }
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
      const instructions = Handler.resolve(opts.function.runtime)(
        opts.function
      );
      const api = `127.0.0.1:${this.opts.port}/${id}/${opts.function.id}`;
      const env = {
        ...opts.env,
        ...instructions.run.env,
        AWS_LAMBDA_RUNTIME_API: api,
        IS_LOCAL: "true",
      };
      logger.debug("Spawning", instructions.run);
      const proc = spawn(instructions.run.command, instructions.run.args, {
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
