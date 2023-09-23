import { Context } from "../context/context.js";
import { Logger } from "../logger.js";
import path from "path";
import zlib from "zlib";
import fs from "fs/promises";
import { useWatcher } from "../watcher.js";
import { useBus } from "../bus.js";
import crypto from "crypto";
import { useProject } from "../project.js";
import { FunctionProps, useFunctions } from "../constructs/Function.js";
import { useNodeHandler } from "./handlers/node.js";
import { useContainerHandler } from "./handlers/container.js";
import { useDotnetHandler } from "./handlers/dotnet.js";
import { useGoHandler } from "./handlers/go.js";
import { useJavaHandler } from "./handlers/java.js";
import { usePythonHandler } from "./handlers/python.js";
import { useRustHandler } from "./handlers/rust.js";
import { lazy } from "../util/lazy.js";

declare module "../bus.js" {
  export interface Events {
    "function.build.started": {
      functionID: string;
    };
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

export interface StartWorkerInput {
  url: string;
  workerID: string;
  functionID: string;
  environment: Record<string, string>;
  out: string;
  handler: string;
  runtime: string;
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
        sourcemap?: string;
      }
    | {
        type: "error";
        errors: string[];
      }
  >;
}

export const useRuntimeHandlers = lazy(() => {
  const handlers: RuntimeHandler[] = [
    useNodeHandler(),
    useGoHandler(),
    useContainerHandler(),
    usePythonHandler(),
    useJavaHandler(),
    useDotnetHandler(),
    useRustHandler(),
  ];
  const project = useProject();
  const bus = useBus();

  const pendingBuilds = new Map<string, any>();

  const result = {
    subscribe: bus.forward("function.build.success", "function.build.failed"),
    register: (handler: RuntimeHandler) => {
      handlers.push(handler);
    },
    for: (runtime: string) => {
      const result = handlers.find((x) => x.canHandle(runtime));
      if (!result) throw new Error(`${runtime} runtime is unsupported`);
      return result;
    },
    async build(functionID: string, mode: BuildInput["mode"]) {
      async function task() {
        const func = useFunctions().fromID(functionID);
        if (!func)
          return {
            type: "error" as const,
            errors: [`Function with ID "${functionID}" not found`],
          };
        const handler = result.for(func.runtime!);
        const out = path.join(project.paths.artifacts, functionID);
        await fs.rm(out, { recursive: true, force: true });
        await fs.mkdir(out, { recursive: true });

        bus.publish("function.build.started", { functionID });

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
                throw new Error(
                  `Copy destination path "${to}" must be relative`
                );
              const toPath = path.join(out, to);
              if (mode === "deploy")
                await fs.cp(fromPath, toPath, {
                  recursive: true,
                });
              if (mode === "start") {
                try {
                  const dir = path.dirname(toPath);
                  await fs.mkdir(dir, { recursive: true });
                  await fs.symlink(fromPath, toPath);
                } catch (ex) {
                  Logger.debug("Failed to symlink", fromPath, toPath, ex);
                }
              }
            })
          );
        }

        if (func.hooks?.afterBuild) await func.hooks.afterBuild(func, out);

        bus.publish("function.build.success", { functionID });
        return {
          ...built,
          out,
          sourcemap: built.sourcemap,
        };
      }

      if (pendingBuilds.has(functionID)) {
        Logger.debug("Waiting on pending build", functionID);
        return pendingBuilds.get(functionID)! as ReturnType<typeof task>;
      }
      const promise = task();
      pendingBuilds.set(functionID, promise);
      Logger.debug("Building function", functionID);
      const r = await promise;
      pendingBuilds.delete(functionID);
      return r;
    },
  };

  return result;
});

interface Artifact {
  out: string;
  handler: string;
}

export const useFunctionBuilder = lazy(() => {
  const artifacts = new Map<string, Artifact>();
  const handlers = useRuntimeHandlers();

  const result = {
    artifact: (functionID: string) => {
      if (artifacts.has(functionID)) return artifacts.get(functionID)!;
      return result.build(functionID);
    },
    build: async (functionID: string) => {
      const result = await handlers.build(functionID, "start");
      if (!result) return;
      if (result.type === "error") return;
      artifacts.set(functionID, result);
      return artifacts.get(functionID)!;
    },
  };

  const watcher = useWatcher();
  watcher.subscribe("file.changed", async (evt) => {
    try {
      const functions = useFunctions();
      for (const [functionID, info] of Object.entries(functions.all)) {
        const handler = handlers.for(info.runtime!);
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
    } catch {}
  });

  return result;
});
