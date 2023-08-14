import path from "path";
import { useRuntimeHandlers } from "../handlers.js";
import { useRuntimeWorkers } from "../workers.js";
import { Context } from "../../context/context.js";
import { ChildProcessWithoutNullStreams, exec, spawn } from "child_process";
import { promisify } from "util";
import { useRuntimeServerConfig } from "../server.js";
import { existsAsync, findAbove, isChild } from "../../util/fs.js";
import { Runtime } from "aws-cdk-lib/aws-lambda";
import fs from "fs/promises";
import { bundle } from "./pythonBundling.js";
const execAsync = promisify(exec);
import os from "os";
import url from "url";

const RUNTIME_MAP: Record<string, Runtime> = {
  "python2.7": Runtime.PYTHON_2_7,
  "python3.6": Runtime.PYTHON_3_6,
  "python3.7": Runtime.PYTHON_3_7,
  "python3.8": Runtime.PYTHON_3_8,
  "python3.9": Runtime.PYTHON_3_9,
  "python3.10": Runtime.PYTHON_3_10,
  "python3.11": Runtime.PYTHON_3_11,
};

export const usePythonHandler = Context.memo(async () => {
  const workers = await useRuntimeWorkers();
  const server = await useRuntimeServerConfig();
  const handlers = useRuntimeHandlers();
  const processes = new Map<string, ChildProcessWithoutNullStreams>();
  const sources = new Map<string, string>();

  async function findSrc(input: string) {
    const hints = ["requirements.txt", "Pipfile", "poetry.lock"];
    for (const hint of hints) {
      const result = await findAbove(input, hint);
      if (result) return result;
    }
  }

  handlers.register({
    shouldBuild: (input) => {
      const parent = sources.get(input.functionID);
      if (!parent) return false;
      return isChild(parent, input.file);
    },
    canHandle: (input) => input.startsWith("python"),
    startWorker: async (input) => {
      const src = await findSrc(input.handler);
      if (!src) throw new Error(`Could not find src for ${input.handler}`);
      const parsed = path.parse(path.relative(src, input.handler));
      const target = [...parsed.dir.split(path.sep), parsed.name].join(".");
      const proc = spawn(
        os.platform() === "win32" ? "python.exe" : "python3",
        [
          "-u",
          url.fileURLToPath(
            new URL("../../support/python-runtime/runtime.py", import.meta.url)
          ),
          target,
          src,
          parsed.ext.substring(1),
        ],
        {
          env: {
            ...process.env,
            ...input.environment,
            IS_LOCAL: "true",
            AWS_LAMBDA_FUNCTION_MEMORY_SIZE: "1024",
            AWS_LAMBDA_RUNTIME_API: `localhost:${server.port}/${input.workerID}`,
          },
          shell: true,
          cwd: src,
        }
      );
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
      if (input.mode === "start")
        return {
          type: "success",
          handler: input.props.handler!,
        };

      const src = await findSrc(input.props.handler!);
      if (!src)
        return {
          type: "error",
          errors: [`Could not find src for ${input.props.handler}`],
        };

      bundle({
        installCommands: input.props.python?.installCommands,
        entry: src,
        runtime: RUNTIME_MAP[input.props.runtime!],
        architecture: input.props.architecture,
        outputPathSuffix: ".",
        out: input.out,
      });
      /*
      await fs.cp(src, input.out, {
        recursive: true,
        filter: (src) => !src.includes(".sst"),
      });

      if (await existsAsync(path.join(src, "Pipfile"))) {
        await execAsync("pipenv requirements > requirements.txt", {
          cwd: input.out,
        });
      }
      if (await existsAsync(path.join(src, "poetry.lock"))) {
        await execAsync(
          "poetry export --with-credentials --format requirements.txt --output requirements.txt",
          {
            cwd: input.out,
          }
        );
      }
      if (await existsAsync(path.join(src, "requirements.txt"))) {
        await execAsync("pip install -r requirements.txt", {
          cwd: input.out,
        });
      }

      if (input.props.python?.installCommands) {
        for (const cmd of input.props.python.installCommands) {
          await execAsync(cmd, {
            cwd: input.out,
          });
        }
      }
      */

      return {
        type: "success",
        handler: path
          .relative(src, path.resolve(input.props.handler!))
          .split(path.sep)
          .join(path.posix.sep),
      };
    },
  });
});
