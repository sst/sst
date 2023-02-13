import path from "path";
import fs from "fs/promises";
import { useRuntimeHandlers } from "../handlers.js";
import { useRuntimeWorkers } from "../workers.js";
import { Context } from "../../context/context.js";
import { VisibleError } from "../../error.js";
import { ChildProcessWithoutNullStreams, exec, spawn } from "child_process";
import { promisify } from "util";
import { useRuntimeServerConfig } from "../server.js";
import { findAbove, findBelow, isChild } from "../../util/fs.js";
const execAsync = promisify(exec);

export const useRustHandler = Context.memo(async () => {
  const workers = await useRuntimeWorkers();
  const server = await useRuntimeServerConfig();
  const handlers = useRuntimeHandlers();
  const processes = new Map<string, ChildProcessWithoutNullStreams>();
  const sources = new Map<string, string>();
  const handlerName = process.platform === "win32" ? `handler.exe` : `handler`;

  handlers.register({
    shouldBuild: (input) => {
      if (!input.file.endsWith(".rs")) return false;
      const parent = sources.get(input.functionID);
      if (!parent) return false;
      const result = isChild(parent, input.file);
      return result;
    },
    canHandle: (input) => input.startsWith("rust"),
    startWorker: async (input) => {
      const proc = spawn(path.join(input.out, handlerName), {
        env: {
          ...process.env,
          ...input.environment,
          IS_LOCAL: "true",
          RUST_BACKTRACE: "1",
          AWS_LAMBDA_RUNTIME_API: `http://localhost:${server.port}/${input.workerID}`,
          AWS_LAMBDA_FUNCTION_MEMORY_SIZE: "1024",
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
      const project = await findAbove(parsed.dir, "Cargo.toml");
      sources.set(input.functionID, project);

      if (input.mode === "start") {
        try {
          await execAsync(`cargo build --bin ${parsed.name}`, {
            cwd: project,
            env: {
              ...process.env,
            },
          });
          await fs.cp(
            path.join(project, `target/debug`, parsed.name),
            path.join(input.out, "handler")
          );
        } catch (ex) {
          throw new VisibleError("Failed to build");
        }
      }

      if (input.mode === "deploy") {
        try {
          await execAsync(`cargo lambda build --release --bin ${parsed.name}`, {
            cwd: project,
            env: {
              ...process.env,
            },
          });
          await fs.cp(
            path.join(project, `target/lambda/`, parsed.name, "bootstrap"),
            path.join(input.out, "bootstrap")
          );
        } catch (ex) {
          throw new VisibleError("Failed to build");
        }
      }

      return {
        type: "success",
        handler: "handler",
      };
    },
  });
});
