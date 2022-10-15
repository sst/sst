import { Context } from "@serverless-stack/node/context/context.js";
import { useBus } from "../bus/index.js";
import { useFunctionBuilder, useRuntimeHandlers } from "./handlers.js";

interface Worker {
  workerID: string;
  functionID: string;
}

export const useRuntimeWorkers = Context.memo(async () => {
  const workers = new Map<string, Worker>();
  const bus = useBus();
  const handlers = await useRuntimeHandlers();
  const builder = await useFunctionBuilder();

  bus.subscribe("function.invoked", async (evt) => {
    let worker = workers.get(evt.properties.workerID);
    if (worker) return;
    const handler = handlers.for("test");
    if (!handler) return;
    await builder.ensureBuilt(evt.properties.functionID);
    await handler.startWorker(evt.properties.workerID);
    workers.set(evt.properties.workerID, {
      workerID: evt.properties.workerID,
      functionID: evt.properties.functionID,
    });
  });

  return {
    fromID(workerID: string) {
      return workers.get(workerID)!;
    },
  };
});
