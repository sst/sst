import path from "path";
import fs from "fs/promises";
import { useRuntimeHandlers } from "../handlers.js";
import { useRuntimeWorkers } from "../workers.js";
import { Context } from "../../context/context.js";
import { VisibleError } from "../../error.js";
import { ChildProcessWithoutNullStreams, exec, spawn } from "child_process";
import { promisify } from "util";
import { useRuntimeServerConfig } from "../server.js";
import { isChild } from "../../util/fs.js";
import { execAsync } from "../../util/process.js";

export const useGoHandler = Context.memo(async () => {
  const workers = await useRuntimeWorkers();
  const server = await useRuntimeServerConfig();
  const handlers = useRuntimeHandlers();
  const processes = new Map<string, ChildProcessWithoutNullStreams>();
  const sources = new Map<string, string>();
  const handlerName =
    process.platform === "win32" ? `bootstrap.exe` : `bootstrap`;

  handlers.register({
    shouldBuild: (input) => {
      const parent = sources.get(input.functionID);
      if (!parent) return false;
      return isChild(parent, input.file);
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
        cwd: input.out,
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
      const src = path.relative(project, input.props.handler!);

      if (input.mode === "start") {
        try {
          const target = path.join(input.out, handlerName);
          const result = await execAsync(
            `go build -ldflags '-s -w' -o '${target}' ./${src}`,
            {
              cwd: project,
              env: {
                ...process.env,
              },
            }
          );
        } catch (ex) {
          throw new VisibleError(`Failed to build ${ex}`);
        }
      }

      if (input.mode === "deploy") {
        try {
          const target = path.join(input.out, "bootstrap");
          await execAsync(`go build -ldflags '-s -w' -o '${target}' ./${src}`, {
            cwd: project,
            env: {
              ...process.env,
              CGO_ENABLED: "0",
              GOARCH: input.props.architecture === "arm_64" ? "arm64" : "amd64",
              GOOS: "linux",
            },
          });
        } catch {
          throw new VisibleError("Failed to build");
        }
      }

      return {
        type: "success",
        handler: "bootstrap",
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
