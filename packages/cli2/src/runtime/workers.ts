import { Context } from "@serverless-stack/node/context/index.js";
import { useBus } from "../bus";
import { useMetadata } from "../stacks/metadata.js";

export interface Worker {
  workerID: string;
  functionID: string;
  pid: string;
}

export const useWorkers = Context.memo(async () => {
  const workers = new Map<string, Worker>();
  const bus = useBus();
  const metadata = functions(await useMetadata());

  function functions(metadata: Record<string, any[]>) {
    for (const [stackID, meta] of Object.entries(metadata)) {
      for (const item of meta) {
        if (item.type === "Function") {
          console.log(item);
        }
      }
    }
  }

  bus.subscribe("stacks.metadata", (evt) => {});

  bus.subscribe("function.invoked", (evt) => {
    let worker = workers.get(evt.properties.workerID);
    if (worker) return;
    worker = {
      workerID: evt.properties.workerID,
      functionID: evt.properties.functionID,
      pid: "0",
    };
  });

  return {
    fromID(workerID: string) {
      return workers.get(workerID)!;
    },
  };
});
