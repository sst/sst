import { Context } from "../context/context.js";
import { Logger } from "../logger.js";
import path from "path";
import fs from "fs/promises";
import { useWatcher } from "../watcher.js";
import { useBus } from "../bus.js";
import { useProject } from "../app.js";
import { FunctionProps, useFunctions } from "../constructs/Function.js";
import { useNodeHandler } from "./node.js";

declare module "../bus.js" {
  export interface Events {
    "function.built": {
      functionID: string;
    };
  }
}

interface BuildInput {
  functionID: string;
  mode: "deploy" | "start";
  out: string;
  props: FunctionProps;
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

export interface RuntimeHandler {
  startWorker: (worker: StartWorkerInput) => Promise<void>;
  stopWorker: (workerID: string) => Promise<void>;
  shouldBuild: (input: ShouldBuildInput) => boolean;
  canHandle: (runtime: string) => boolean;
  build: (input: BuildInput) => Promise<{
    handler: string;
  }>;
}

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
    subscribe: bus.forward("function.built"),
    artifact: (functionID: string) => {
      if (artifacts.has(functionID)) return artifacts.get(functionID)!;
      return result.build(functionID);
    },
    build: async (functionID: string) => {
      Logger.debug("Building function", functionID);
      const handler = handlers.for("node");
      const func = useFunctions().fromID(functionID);
      const out = path.join(artifactPath, functionID);
      await fs.rm(out, { recursive: true, force: true });
      await fs.mkdir(out, { recursive: true });
      const result = await handler!.build({
        functionID,
        out,
        mode: "start",
        props: func,
      });
      artifacts.set(functionID, {
        out,
        handler: result.handler,
      });
      bus.publish("function.built", { functionID });
      return artifacts.get(functionID)!;
    },
  };

  const watcher = useWatcher();
  watcher.subscribe("file.changed", async (evt) => {
    const functions = useFunctions();
    for (const [functionID, props] of Object.entries(functions.all)) {
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
