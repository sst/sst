import { Context } from "@serverless-stack/node/context/context.js";
import { useBus } from "../bus/index.js";
import { useFunctionBuilder, useRuntimeHandlers } from "./handlers.js";
import { useRuntimeServerConfig } from "./server.js";

declare module "../bus/index.js" {
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
  }
}

interface Worker {
  workerID: string;
  functionID: string;
}

export const useRuntimeWorkers = Context.memo(async () => {
  const workers = new Map<string, Worker>();
  const bus = useBus();
  const handlers = await useRuntimeHandlers();
  const builder = await useFunctionBuilder();
  const server = useRuntimeServerConfig();

  builder.on("function.built", async (evt) => {
    for (const [_, worker] of workers) {
      if (worker.functionID === evt.properties.functionID) {
        const handler = handlers.for("test");
        await handler?.stopWorker(worker.workerID);
        bus.publish("worker.stopped", worker);
      }
    }
  });

  bus.subscribe("function.invoked", async (evt) => {
    let worker = workers.get(evt.properties.workerID);
    if (worker) return;
    const handler = handlers.for("test");
    if (!handler) return;
    const build = await builder.artifact(evt.properties.functionID);
    await handler.startWorker({
      ...build,
      workerID: evt.properties.workerID,
      environment: evt.properties.env,
      url: `${server.url}/${evt.properties.workerID}/${server.API_VERSION}`,
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
    exited(workerID: string) {
      const existing = workers.get(workerID);
      if (!existing) return;
      workers.delete(workerID);
      bus.publish("worker.exited", existing);
    },
    subscribe: bus.forward("worker.started", "worker.stopped", "worker.exited"),
  };
});
