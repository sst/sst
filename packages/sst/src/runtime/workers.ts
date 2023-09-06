import { Context } from "../context/context.js";
import { useBus } from "../bus.js";
import { useFunctionBuilder, useRuntimeHandlers } from "./handlers.js";
import { useRuntimeServerConfig } from "./server.js";
import { Logger } from "../logger.js";
import { useFunctions } from "../constructs/Function.js";
import { lazy } from "../util/lazy.js";

declare module "../bus.js" {
  export interface Events {
    "worker.started": {
      workerID: string;
      functionID: string;
    };
    "worker.stopped": {
      workerID: string;
      functionID: string;
    };
    "worker.exited": {
      workerID: string;
      functionID: string;
    };
    "worker.stdout": {
      workerID: string;
      functionID: string;
      requestID: string;
      message: string;
    };
  }
}

interface Worker {
  workerID: string;
  functionID: string;
}

export const useRuntimeWorkers = lazy(async () => {
  const workers = new Map<string, Worker>();
  const bus = useBus();
  const handlers = useRuntimeHandlers();
  const builder = useFunctionBuilder();
  const server = await useRuntimeServerConfig();

  handlers.subscribe("function.build.success", async (evt) => {
    for (const [_, worker] of workers) {
      if (worker.functionID === evt.properties.functionID) {
        const props = useFunctions().fromID(worker.functionID);
        if (!props) return;
        const handler = handlers.for(props.runtime!);
        await handler?.stopWorker(worker.workerID);
        bus.publish("worker.stopped", worker);
      }
    }
  });

  const lastRequestId = new Map<string, string>();
  bus.subscribe("function.invoked", async (evt) => {
    bus.publish("function.ack", {
      functionID: evt.properties.functionID,
      workerID: evt.properties.workerID,
    });
    lastRequestId.set(evt.properties.workerID, evt.properties.requestID);
    let worker = workers.get(evt.properties.workerID);
    if (worker) return;
    const props = useFunctions().fromID(evt.properties.functionID);
    if (!props) return;
    const handler = handlers.for(props.runtime!);
    if (!handler) return;
    const build = await builder.artifact(evt.properties.functionID);
    if (!build) return;
    await handler.startWorker({
      ...build,
      workerID: evt.properties.workerID,
      functionID: evt.properties.functionID,
      environment: evt.properties.env,
      url: `${server.url}/${evt.properties.workerID}/${server.API_VERSION}`,
      runtime: props.runtime!,
    });
    workers.set(evt.properties.workerID, {
      workerID: evt.properties.workerID,
      functionID: evt.properties.functionID,
    });
    bus.publish("worker.started", {
      workerID: evt.properties.workerID,
      functionID: evt.properties.functionID,
    });
  });

  return {
    fromID(workerID: string) {
      return workers.get(workerID)!;
    },
    getCurrentRequestID(workerID: string) {
      return lastRequestId.get(workerID);
    },
    stdout(workerID: string, message: string) {
      const worker = workers.get(workerID)!;
      bus.publish("worker.stdout", {
        ...worker,
        message: message.trim(),
        requestID: lastRequestId.get(workerID)!,
      });
    },
    exited(workerID: string) {
      const existing = workers.get(workerID);
      if (!existing) return;
      workers.delete(workerID);
      lastRequestId.delete(workerID);
      bus.publish("worker.exited", existing);
    },
    subscribe: bus.forward(
      "worker.started",
      "worker.stopped",
      "worker.exited",
      "worker.stdout"
    ),
  };
});
