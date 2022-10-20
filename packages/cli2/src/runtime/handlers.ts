import { Context } from "@serverless-stack/node/context/context.js";
import { Logger } from "../logger/index.js";
import { useMetadata } from "../stacks/metadata.js";
import { useStateDirectory } from "../state/index.js";
import path from "path";
import fs from "fs/promises";
import { useWatcher } from "../watcher/watcher.js";
import { useBus } from "../bus/index.js";

declare module "../bus/index.js" {
  export interface Events {
    "function.built": {
      functionID: string;
    };
  }
}

interface BuildInput {
  functionID: string;
  mode: "deploy" | "start";
  srcPath: string;
  handler: string;
  out: string;
}

interface StartWorkerInput {
  url: string;
  workerID: string;
  environment: Record<string, string>;
  out: string;
  handler: string;
}

interface ShouldBuildInput {
  file: string;
  functionID: string;
}

interface RuntimeHandler {
  startWorker: (worker: StartWorkerInput) => Promise<void>;
  stopWorker: (workerID: string) => Promise<void>;
  shouldBuild: (input: ShouldBuildInput) => boolean;
  canHandle: (runtime: string) => boolean;
  build: (input: BuildInput) => Promise<string>;
}

export const useFunctions = Context.memo(async () => {
  const metadata = await useMetadata();
  const result: Record<string, any> = {};
  for (const [_, meta] of Object.entries(metadata)) {
    for (const item of meta) {
      if (item.type === "Function") {
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

interface Artifact {
  out: string;
  handler: string;
}

export const useFunctionBuilder = Context.memo(async () => {
  const artifacts = new Map<string, Artifact>();
  const handlers = await useRuntimeHandlers();
  const bus = useBus();
  const artifactPath = path.join(await useStateDirectory(), "artifacts");

  const result = {
    on: bus.forward("function.built"),
    artifact: (functionID: string) => {
      if (artifacts.has(functionID)) return artifacts.get(functionID)!;
      return result.build(functionID);
    },
    build: async (functionID: string) => {
      Logger.debug("Building function", functionID);
      const handler = handlers.for("node");
      const functions = await useFunctions();
      const func = functions[functionID];
      const out = path.join(artifactPath, functionID);
      await fs.rm(out, { recursive: true });
      await fs.mkdir(out, { recursive: true });
      const result = await handler!.build({
        functionID,
        out,
        mode: "start",
        handler: func.data.handler,
        srcPath: func.data.srcPath,
      });
      artifacts.set(functionID, {
        out,
        handler: result,
      });
      bus.publish("function.built", { functionID });
      return artifacts.get(functionID)!;
    },
  };

  const watcher = await useWatcher();
  watcher.subscribe("file.changed", async (evt) => {
    const functions = await useFunctions();
    for (const [_, func] of Object.entries(functions)) {
      const functionID = func.data.localId;
      const handler = handlers.for("node");
      if (
        !handler?.shouldBuild({
          functionID,
          file: evt.properties.file,
        })
      )
        continue;
      await result.build(functionID);
      Logger.debug("Rebuilt function", functionID);
    }
  });

  return result;
});
