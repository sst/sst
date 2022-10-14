import express from "express";
import { Events, useBus } from "../bus/index.js";
import { useWorkers } from "./workers.js";

const API_VERSION = "2018-06-01";

declare module "../bus/index.js" {
  export interface Events {
    "function.invoked": {
      workerID: string;
      functionID: string;
      requestID: string;
      env: Record<string, any>;
      event: any;
      context: any;
      deadline: number;
    };
    "function.success": {
      workerID: string;
      functionID: string;
      body: any;
    };
    "function.error": {
      workerID: string;
      functionID: string;
      errorType: string;
      errorMessage: string;
      stackTrace: string[];
    };
  }
}

export async function createRuntimeServer() {
  const bus = useBus();
  const app = express();
  const workers = await useWorkers();

  const workersWaiting = new Map<
    string,
    (evt: Events["function.invoked"]) => void
  >();
  const invocationsQueued = new Map<string, Events["function.invoked"][]>();

  function next(workerID: string) {
    const queue = invocationsQueued.get(workerID);
    const value = queue?.shift();
    if (value) return value;

    return new Promise<Events["function.invoked"]>((resolve, reject) => {
      workersWaiting.set(workerID, resolve);
    });
  }

  bus.subscribe("function.invoked", async (evt) => {
    const worker = workersWaiting.get(evt.properties.workerID);
    if (worker) {
      workersWaiting.delete(evt.properties.workerID);
      worker(evt.properties);
      return;
    }

    let arr = invocationsQueued.get(evt.properties.workerID);
    if (!arr) {
      arr = [];
      invocationsQueued.set(evt.properties.workerID, arr);
    }
    arr.push(evt.properties);
  });

  app.post<{ functionID: string; workerID: string }>(
    `/:workerID/${API_VERSION}/runtime/init/error`,
    express.json({
      strict: false,
      type: ["application/json", "application/*+json"],
      limit: "10mb",
    }),
    async (req, res) => {
      const worker = workers.fromID(req.params.workerID);
      bus.publish("function.error", {
        functionID: worker.functionID,
        ...req.body,
      });

      res.json("ok");
    }
  );

  app.post<{ functionID: string; workerID: string }>(
    `/:workerID/${API_VERSION}/runtime/invocation/next`,
    async (req, res) => {
      const payload = await next(req.params.workerID);
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
    }
  );

  app.post<{
    workerID: string;
    awsRequestId: string;
  }>(
    `/:workerID/${API_VERSION}/runtime/invocation/:awsRequestId/response`,
    express.json({
      strict: false,
      type: ["application/json", "application/*+json"],
      limit: "10mb",
    }),
    (req, res) => {
      const worker = workers.fromID(req.params.workerID)!;
      bus.publish("function.success", {
        workerID: worker.workerID,
        functionID: worker.functionID,
        body: req.body,
      });
      res.status(202).send();
    }
  );

  app.post<{
    workerID: string;
    awsRequestId: string;
  }>(
    `/:workerID/${API_VERSION}/runtime/invocation/:awsRequestId/error`,
    express.json({
      strict: false,
      type: ["application/json", "application/*+json"],
      limit: "10mb",
    }),
    (req, res) => {
      const worker = workers.fromID(req.params.workerID)!;
      bus.publish("function.error", {
        workerID: worker.workerID,
        functionID: worker.functionID,
        errorType: req.body.errorType,
        errorMessage: req.body.errorMessage,
        stackTrace: req.body.trace,
      });
      res.status(202).send();
    }
  );

  app.listen(12557);
}
