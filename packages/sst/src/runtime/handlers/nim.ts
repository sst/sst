import path from "path";
import fs from "fs/promises";
import { RuntimeHandler } from "../handlers.js";
import { useRuntimeWorkers } from "../workers.js";
import { ChildProcessWithoutNullStreams, exec, spawn } from "child_process";
import { promisify } from "util";
import { useRuntimeServerConfig } from "../server.js";
import { findBelow, isChild } from "../../util/fs.js";
import { useProject } from "../../project.js";
const execAsync = promisify(exec);

export const useNimHandler = (): RuntimeHandler => {
  const processes = new Map<string, ChildProcessWithoutNullStreams>();
  const sources = new Map<string, string>();
  const handlerName = process.platform === "win32" ? 'bootstrap.exe' : 'bootstrap';

  return {
    shouldBuild: (input) => {
      const parent = sources.get(input.functionID);
      if (!parent) return false;
      return isChild(parent, input.file);
    },
    canHandle: (input) => input.startsWith("nim"),
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
      const project = useProject();
      const nimble = await findNimble();
      const parsed = path.parse(input.props.handler!);
      const srcPath = nimble && await findBelow(project.paths.root, nimble);
      const buildTask = input.props.nim?.buildTask;
      const outputDir = input.props.nim?.buildOutputDir || "out";
      sources.set(input.functionID, nimble || project.paths.root);

      try {
        if (buildTask) {
          await execAsync(buildTask);
        } else {
          const buildArgs = input.props.nim?.buildArgs || [];

          if (input.mode === "deploy") {
            buildArgs.push('-d:release');
          }

          if (input.props.architecture === 'arm_64') {
            buildArgs.push('--cpu:arm64');
            buildArgs.push('--os:linux');
          }

          const args = buildArgs.map((i) => i.trim()).join(' ');
          await execAsync(`nim c ${args} -o:${outputDir}/${parsed.name} ${input.props.handler}`, { cwd: srcPath })
        }

        await fs.cp(
          path.join(outputDir, parsed.name),
          path.join(input.out, "bootstrap"),
        );
      } catch (error) {
        return {
          type: "error",
          errors: [String(error)],
        };
      }

      return {
        type: "success",
        handler: "bootstrap",
      };
    },
  };
};

async function findNimble(): Promise<string | undefined> {
  const files = await fs.readdir(process.cwd())
  return files.find(name => name.endsWith('.nimble'));
};

