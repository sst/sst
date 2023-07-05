import { useRuntimeHandlers } from "../handlers.js";
import { useRuntimeWorkers } from "../workers.js";
import { Context } from "../../context/context.js";
import { VisibleError } from "../../error.js";
import { spawn } from "child_process";
import { useRuntimeServerConfig } from "../server.js";
import { isChild } from "../../util/fs.js";
import { execAsync } from "../../util/process.js";

export const useContainerHandler = Context.memo(async () => {
  const workers = await useRuntimeWorkers();
  const server = await useRuntimeServerConfig();
  const handlers = useRuntimeHandlers();
  const containers = new Map<string, string>();
  const sources = new Map<string, string>();

  handlers.register({
    shouldBuild: (input) => {
      const parent = sources.get(input.functionID);
      if (!parent) return false;
      return isChild(parent, input.file);
    },
    canHandle: (input) => input.startsWith("container"),
    startWorker: async (input) => {
      const name = `sst-workerID-${input.workerID}-${Date.now()}`;
      const proc = spawn(
        "docker",
        [
          "run",
          "--rm",
          "--network=host",
          `--name=${name}`,
          ...Object.entries({
            ...input.environment,
            IS_LOCAL: "true",
            AWS_LAMBDA_RUNTIME_API: `host.docker.internal:${server.port}/${input.workerID}`,
          })
            .map(([key, value]) => ["-e", `${key}=${value}`])
            .flat(),
          `sst-dev:${input.functionID}`,
        ],
        {
          env: {
            ...process.env,
          },
          cwd: input.out,
        }
      );
      proc.on("exit", () => {
        workers.exited(input.workerID);
      });
      proc.stdout.on("data", (data: Buffer) => {
        workers.stdout(input.workerID, data.toString());
      });
      proc.stderr.on("data", (data: Buffer) => {
        workers.stdout(input.workerID, data.toString());
      });
      containers.set(input.workerID, name);
    },
    stopWorker: async (workerID) => {
      const name = containers.get(workerID);
      if (name) {
        try {
          // note:
          // - calling `docker kill` kills the docker process much faster than `docker stop`
          // - process.kill() does not work on docker processes
          await execAsync(`docker kill ${name}`, {
            env: {
              ...process.env,
            },
          });
        } catch (ex) {
          console.error(ex);
          throw new VisibleError(`Could not stop docker container ${name}`);
        }
        containers.delete(workerID);
      }
    },
    build: async (input) => {
      const project = input.props.handler!;
      sources.set(input.functionID, project);

      if (input.mode === "start") {
        try {
          const result = await execAsync(
            `docker build -t sst-dev:${input.functionID} .`,
            {
              cwd: project,
              env: {
                ...process.env,
              },
            }
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
          const platform =
            input.props.architecture === "arm_64"
              ? "linux/arm64"
              : "linux/amd64";
          await execAsync(
            [
              `docker build`,
              `-t sst-build:${input.functionID}`,
              `--platform ${platform}`,
              `.`,
            ].join(" "),
            {
              cwd: project,
              env: {
                ...process.env,
              },
            }
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
        handler: "not required for container",
      };
    },
  });
});
