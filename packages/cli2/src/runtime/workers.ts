import { Context } from "@serverless-stack/node/context/index.js";
import { useBus } from "../bus";
import { MetadataContext } from "../stacks/metadata.js";
import { fetch } from "undici";

declare module "../bus/index.js" {
  export interface Events {
    "worker.needed": {
      workerID: string;
      functionID: string;
      runtime: string;
    };
  }
}

export interface Worker {
  workerID: string;
  functionID: string;
}

const useFunctions = Context.memo(async () => {
  const metadata = await MetadataContext.use();
  const result = [];
  for (const [stackID, meta] of Object.entries(metadata)) {
    for (const item of meta) {
      if (item.type === "Function") {
        result.push(item);
      }
    }
  }
  return result;
});

export const useWorkers = Context.memo(async () => {
  const workers = new Map<string, Worker>();
  const bus = useBus();

  bus.subscribe("function.invoked", async (evt) => {
    let worker = workers.get(evt.properties.workerID);
    if (worker) return;
    bus.publish("worker.needed", {
      workerID: evt.properties.workerID,
      functionID: evt.properties.functionID,
      runtime: "nodejs14.x",
    });
  });

  return {
    fromID(workerID: string) {
      return workers.get(workerID)!;
    },
    register(workerID: string, functionID: string) {
      workers.set(workerID, { workerID, functionID });
    },
    unregister(workerID: string) {
      workers.delete(workerID);
    },
  };
});

export const createNodeWorker = async () => {
  const bus = useBus();
  const workers = await useWorkers();

  bus.subscribe("worker.needed", async (evt) => {
    workers.register(evt.properties.workerID, evt.properties.functionID);

    while (true) {
      const result = await fetch(
        `https://localhost:12557/${evt.properties.workerID}/runtime/invocation/next`
      ).then((x) => x.json());

      console.log(result);

      await fetch(
        `https://localhost:12557/${evt.properties.workerID}/runtime/invocation/response`,
        {
          method: "POST",
          body: JSON.stringify("Hello"),
        }
      );
    }
  });
};
