import express from "express";
import spawn from "cross-spawn";
import path from "path";
import { ChildProcess } from "child_process";
import { getChildLogger } from "../logger";
import crypto from "crypto";

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
  error: any;
};

type Response = ResponseSuccess | ResponseFailure | ResponseTimeout;

export class Server {
  private readonly app: express.Express;
  private readonly pools: Record<string, Pool> = {};
  private readonly opts: ServerOpts;

  constructor(opts: ServerOpts) {
    this.app = express();
    this.app.use(
      express.json({
        type: ["application/json", "application/*+json"],
        limit: "10mb",
      })
    );
    this.opts = opts;

    this.app.post<{
      fun: string;
    }>(`/:fun/${API_VERSION}/runtime/init/error`, async (_req, res) => {
      res.json("ok");
    });

    this.app.get<{
      fun: string;
    }>(`/:fun/${API_VERSION}/runtime/invocation/next`, async (req, res) => {
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
      res.json(payload.event);
    });

    this.app.post<{
      fun: string;
      awsRequestId: string;
    }>(
      `/:fun/${API_VERSION}/runtime/invocation/:awsRequestId/response`,
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
      awsRequestId: string;
    }>(
      `/:fun/${API_VERSION}/runtime/invocation/:awsRequestId/error`,
      (req, res) => {
        logger.debug(
          "Received error for",
          req.params.awsRequestId,
          req.params.fun
        );
        this.response(req.params.fun, req.params.awsRequestId, {
          type: "failure",
          error: req.body,
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
    const api = `127.0.0.1:${this.opts.port}/${fun}`;
    const env = {
      ...opts.env,
      ...cmd.env,
      AWS_LAMBDA_RUNTIME_API: api,
    };
    logger.debug("Spawning", cmd.command);
    const proc = spawn(cmd.command, cmd.args, {
      env,
      stdio: "inherit",
    });
    pool.processes.push(proc);
  }
}

type Pool = {
  waiting: ((p: Payload) => void)[];
  processes: ChildProcess[];
  requests: Record<string, (any: Response) => void>;
  pending: Payload[];
};
