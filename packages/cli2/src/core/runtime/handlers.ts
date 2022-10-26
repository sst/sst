import { Context } from "@serverless-stack/node/context/context.js";
import { Logger } from "@core/logger.js";
import { useMetadata } from "@core/stacks/metadata.js";
import path from "path";
import fs from "fs/promises";
import { useWatcher } from "@core/watcher.js";
import { useBus } from "@core/bus.js";
import { useProject } from "@core/app.js";

declare module "@core/bus.js" {
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

export const useRuntimeHandlers = Context.memo(() => {
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

export const useFunctionBuilder = Context.memo(() => {
  const artifacts = new Map<string, Artifact>();
  const handlers = useRuntimeHandlers();
  const bus = useBus();
  const project = useProject();
  const artifactPath = path.join(project.paths.out, "artifacts");

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

  const watcher = useWatcher();
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
