import { Context } from "@serverless-stack/node/context/context.js";
import { Logger } from "../logger/index.js";
import { useMetadata } from "../stacks/metadata.js";
import { useStateDirectory } from "../state/index.js";
import path from "path";

interface BuildInput {
  functionID: string;
  mode: "deploy" | "start";
  srcPath: string;
  handler: string;
  out: string;
}

interface StartWorkerInput {
  workerID: string;
  environment: Record<string, string>;
}

interface RuntimeHandler {
  startWorker: (worker: StartWorkerInput) => Promise<void>;
  stopWorker: (workerID: string) => void;
  canHandle: (runtime: string) => boolean;
  build: (input: BuildInput) => Promise<void>;
}

const useFunctions = Context.memo(async () => {
  const metadata = await useMetadata();
  const result: Record<string, any> = {};
  for (const [_, meta] of Object.entries(metadata)) {
    for (const item of meta) {
      if (item.type === "Function") {
        console.log(item);
        result[item.data.localId] = item;
      }
    }
  }
  return result;
});

export const useRuntimeHandlers = Context.memo(async () => {
  const handlers: RuntimeHandler[] = [];

  return {
    register: (handler: RuntimeHandler) => {
      handlers.push(handler);
    },
    for: (runtime: string) => {
      return handlers.find((x) => x.canHandle(runtime));
    },
  };
});

export const useFunctionBuilder = Context.memo(async () => {
  const builtOnce = new Set<string>();
  const handlers = await useRuntimeHandlers();
  const artifacts = path.join(await useStateDirectory(), "artifacts");

  const result = {
    ensureBuilt: async (functionID: string) => {
      if (builtOnce.has(functionID)) return;
      await result.build(functionID);
    },
    build: async (functionID: string) => {
      Logger.debug("Building function", functionID);
      const handler = handlers.for("node");
      const functions = await useFunctions();
      const func = functions[functionID];
      await handler?.build({
        functionID,
        out: path.join(artifacts, functionID),
        mode: "start",
        handler: func.data.handler,
        srcPath: func.data.srcPath,
      });
    },
  };

  return result;
});
