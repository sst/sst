import path from "path";
import fs from "fs/promises";
import fsSync from "fs";
import { useProject } from "../app.js";
import esbuild, { BuildOptions } from "esbuild";
import url from "url";
import { Worker } from "worker_threads";
import { useRuntimeHandlers } from "./handlers.js";
import { useRuntimeWorkers } from "./workers.js";
import { Context } from "../context/context.js";
import { VisibleError } from "../error.js";
import { ChildProcessWithoutNullStreams, exec, spawn } from "child_process";
import { promisify } from "util";
import { useRuntimeServer, useRuntimeServerConfig } from "./server.js";
const execAsync = promisify(exec);

export const useGoHandler = Context.memo(() => {
  const workers = useRuntimeWorkers();
  const handlers = useRuntimeHandlers();
  const server = useRuntimeServerConfig();
  const cache: Record<string, esbuild.BuildResult> = {};
  const project = useProject();
  const processes = new Map<string, ChildProcessWithoutNullStreams>();
  const sources = new Map<string, string>();
  const handlerName = process.platform === "win32" ? `handler.exe` : `handler`;

  handlers.register({
    shouldBuild: (input) => {
      const parent = sources.get(input.functionID);
      if (!parent) return false;
      const relative = path.relative(parent, input.file);
      return Boolean(
        relative && !relative.startsWith("..") && !path.isAbsolute(relative)
      );
    },
    canHandle: (input) => input.startsWith("go"),
    startWorker: async (input) => {
      const proc = spawn(path.join(input.out, handlerName), {
        env: {
          ...process.env,
          ...input.environment,
          IS_LOCAL: "true",
          AWS_LAMBDA_RUNTIME_API: `localhost:${server.port}/${input.workerID}`,
        },
      });
      proc.on("exit", () => workers.exited(input.workerID));
      proc.stdout.on("data", (data: Buffer) => {
        workers.stdout(input.workerID, data.toString());
      });
      proc.stderr.on("data", (data: Buffer) => {
        workers.stdout(input.workerID, data.toString());
      });
      processes.set(input.workerID, proc);
    },
    stopWorker: async (workerID) => {
      const proc = processes.get(workerID);
      if (proc) {
        proc.kill();
        processes.delete(workerID);
      }
    },
    build: async (input) => {
      const parsed = path.parse(input.props.handler!);
      const project = await find(parsed.dir, "go.mod");
      sources.set(input.functionID, project);
      const target = path.join(input.out, handlerName);
      const src = path.relative(project, input.props.handler!);

      if (input.mode === "start") {
        try {
          const result = await execAsync(
            `go build -ldflags '-s -w' -o ${target} ./${src}`,
            {
              cwd: project,
              env: {
                ...process.env,
              },
            }
          );
        } catch {
          throw new VisibleError("Failed to build");
        }
      }

      return {
        handler: "handler",
      };
    },
  });
});

async function find(dir: string, target: string): Promise<string> {
  if (dir === "/") throw new VisibleError(`Could not find a ${target} file`);
  if (
    await fs
      .access(path.join(dir, target))
      .then(() => true)
      .catch(() => false)
  )
    return dir;
  return find(path.join(dir, ".."), target);
}
