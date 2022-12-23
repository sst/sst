import { Context } from "../context/context.js";
import { Logger } from "../logger.js";
import path from "path";
import fs from "fs/promises";
import { useWatcher } from "../watcher.js";
import { useBus } from "../bus.js";
import { useProject } from "../app.js";
import { FunctionProps, useFunctions } from "../constructs/Function.js";

declare module "../bus.js" {
  export interface Events {
    "function.build.success": {
      functionID: string;
    };
    "function.build.failed": {
      functionID: string;
      errors: string[];
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
  build: (input: BuildInput) => Promise<
    | {
        type: "success";
        handler: string;
      }
    | {
        type: "error";
        errors: string[];
      }
  >;
}

export const useRuntimeHandlers = Context.memo(() => {
  const handlers: RuntimeHandler[] = [];
  const project = useProject();
  const bus = useBus();

  const result = {
    subscribe: bus.forward("function.build.success", "function.build.failed"),
    register: (handler: RuntimeHandler) => {
      handlers.push(handler);
    },
    for: (runtime: string) => {
      const result = handlers.find((x) => x.canHandle(runtime));
      if (!result) throw new Error(`No handler found for runtime ${runtime}`);
      return result;
    },
    async build(functionID: string, mode: BuildInput["mode"]) {
      Logger.debug("Building function", functionID);
      const func = useFunctions().fromID(functionID);
      const handler = result.for(func.runtime!);
      const out = path.join(project.paths.artifacts, functionID);
      await fs.rm(out, { recursive: true, force: true });
      await fs.mkdir(out, { recursive: true });

      if (func.hooks?.beforeBuild) await func.hooks.beforeBuild(func, out);
      const built = await handler!.build({
        functionID,
        out,
        mode,
        props: func,
      });
      if (built.type === "error") {
        bus.publish("function.build.failed", {
          functionID,
          errors: built.errors,
        });
        return built;
      }
      if (func.copyFiles) {
        await Promise.all(
          func.copyFiles.map(async (entry) => {
            const fromPath = path.join(project.paths.root, entry.from);
            const to = entry.to || entry.from;
            if (path.isAbsolute(to))
              throw new Error(`Copy destination path "${to}" must be relative`);
            const toPath = path.join(out, to);
            if (mode === "deploy")
              await fs.cp(fromPath, toPath, {
                recursive: true,
              });
            if (mode === "start") {
              await fs.symlink(fromPath, toPath);
            }
          })
        );
      }

      if (func.hooks?.afterBuild) await func.hooks.afterBuild(func, out);

      bus.publish("function.build.success", { functionID });
      return {
        ...built,
        out,
      };
    },
  };

  return result;
});

interface Artifact {
  out: string;
  handler: string;
}

export const useFunctionBuilder = Context.memo(() => {
  const artifacts = new Map<string, Artifact>();
  const handlers = useRuntimeHandlers();

  const result = {
    artifact: (functionID: string) => {
      if (artifacts.has(functionID)) return artifacts.get(functionID)!;
      return result.build(functionID);
    },
    build: async (functionID: string) => {
      const result = await handlers.build(functionID, "start");
      if (result.type === "error") return;
      artifacts.set(functionID, result);
      return artifacts.get(functionID)!;
    },
  };

  const watcher = useWatcher();
  watcher.subscribe("file.changed", async (evt) => {
    const functions = useFunctions();
    for (const [functionID, props] of Object.entries(functions.all)) {
      const handler = handlers.for(props.runtime!);
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
