import path from "path";
import fs from "fs/promises";
import { RuntimeHandler, useRuntimeHandlers } from "../handlers.js";
import { useRuntimeWorkers } from "../workers.js";
import { ChildProcessWithoutNullStreams, exec, spawn } from "child_process";
import { promisify } from "util";
import { useRuntimeServerConfig } from "../server.js";
import { findAbove, isChild } from "../../util/fs.js";
const execAsync = promisify(exec);

export const useRustHandler = (): RuntimeHandler => {
  const processes = new Map<string, ChildProcessWithoutNullStreams>();
  const sources = new Map<string, string>();
  const isWindows = process.platform === "win32";
  const handlerName = isWindows ? `handler.exe` : `handler`;

  return {
    shouldBuild: (input) => {
      if (!input.file.endsWith(".rs")) return false;
      const parent = sources.get(input.functionID);
      if (!parent) return false;
      const result = isChild(parent, input.file);
      return result;
    },
    canHandle: (input) => input.startsWith("rust"),
    startWorker: async (input) => {
      const workers = await useRuntimeWorkers();
      const server = await useRuntimeServerConfig();
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
      if (!project)
        return {
          type: "error",
          errors: ["Could not find a Cargo.toml file"],
        };
      sources.set(input.functionID, project);

      if (input.mode === "start") {
        try {
          await execAsync(
            ["cargo", "build", `--bin ${parsed.name}`].join(" "),
            {
              cwd: project,
              env: {
                ...process.env,
              },
            }
          );
          await fs.cp(
            path.join(project, `target/debug`, `${parsed.name}${isWindows ? ".exe" : ""}`),
            path.join(input.out, "handler")
          );
        } catch (ex) {
          return {
            type: "error",
            errors: [String(ex)],
          };
        }
      }

      if (input.mode === "deploy") {
        try {
          await execAsync(
            [
              "cargo",
              "lambda",
              "build",
              "--release",
              ...(input.props.architecture === "arm_64" ? ["--arm64"] : []),
              // Explicitly target glibc 2.26 for Amazon Linux 2
              // https://repost.aws/questions/QUrXOioL46RcCnFGyELJWKLw/glibc-2-27-on-amazon-linux-2
              `--target ${input.props.architecture === "arm_64" ? "aarch64" : "x86_64"}-unknown-linux-gnu.2.26`,
              `--bin ${parsed.name}`,
            ].join(" "),
            {
              cwd: project,
              env: {
                ...process.env,
              },
            }
          );
          await fs.cp(
            path.join(project, `target/lambda/`, parsed.name, "bootstrap"),
            path.join(input.out, "bootstrap")
          );
        } catch (ex) {
          return {
            type: "error",
            errors: [String(ex)],
          };
        }
      }

      return {
        type: "success",
        handler: "handler",
      };
    },
  };
};
