import http from "http";
import { spawn } from "child_process";
import { StartWorkerInput, useRuntimeHandlers } from "../handlers.js";
import { useRuntimeWorkers } from "../workers.js";
import { useRuntimeServerConfig } from "../server.js";
import { Context } from "../../context/context.js";
import { VisibleError } from "../../error.js";
import { isChild } from "../../util/fs.js";
import { execAsync } from "../../util/process.js";
import { useFunctions } from "../../constructs/Function.js";

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
      input.environment.SST_DEBUG_JOB
        ? startJobWorker(input)
        : startLambdaWorker(input);
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

  function dockerRun(
    input: StartWorkerInput,
    opts: {
      entrypoint?: string;
      cmd?: string[];
      envs: Record<string, string>;
    },
    onExit: (code: number) => void
  ) {
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
          ...opts.envs,
          IS_LOCAL: "true",
        })
          .map(([key, value]) => ["-e", `${key}=${value}`])
          .flat(),
        ...(opts.entrypoint !== undefined
          ? ["--entrypoint", opts.entrypoint]
          : []),
        `sst-dev:${input.functionID}`,
        ...(opts.cmd ?? []),
      ],
      {
        env: {
          ...process.env,
        },
        cwd: input.out,
      }
    );
    proc.on("exit", (code: number) => {
      onExit(code);
    });
    proc.stdout.on("data", (data: Buffer) => {
      workers.stdout(input.workerID, data.toString());
    });
    proc.stderr.on("data", (data: Buffer) => {
      workers.stdout(input.workerID, data.toString());
    });
    containers.set(input.workerID, name);
  }

  function startLambdaWorker(input: StartWorkerInput) {
    const fn = useFunctions().fromID(input.functionID);
    dockerRun(
      input,
      {
        cmd: fn?.container?.cmd,
        envs: {
          AWS_LAMBDA_RUNTIME_API: `host.docker.internal:${server.port}/${input.workerID}`,
        },
      },
      () => {
        workers.exited(input.workerID);
      }
    );
  }

  async function startJobWorker(input: StartWorkerInput) {
    // Job container is special:
    // 1. Not capable of receiving the `event` payload
    //    - on `sst deploy`, the CodeBuild job is started with `SST_PAYLOAD` env var
    //    - on `sst dev`, set `SST_DEBUG_JOB` env var here
    // 2. Worker exits at the end of the run.

    // Fetch request
    const result = await init();
    const awsRequestId = result.headers["lambda-runtime-aws-request-id"];
    const fn = useFunctions().fromID(input.functionID);
    try {
      dockerRun(
        input,
        {
          entrypoint: "",
          cmd: fn?.container?.cmd,
          envs: {
            SST_PAYLOAD: result.body,
          },
        },
        async (code) => {
          code === 0 ? await success() : await error();
          workers.exited(input.workerID);
        }
      );
    } catch (ex) {
      await initError(ex);
      workers.exited(input.workerID);
    }

    async function init() {
      return await fetch({
        path: `/runtime/invocation/next`,
        method: "GET",
        headers: {},
      });
    }

    async function initError(ex: any) {
      return await fetch({
        path: `/runtime/init/error`,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          errorType: "Error",
          errorMessage: ex.message,
          trace: ex.stack?.split("\n"),
        }),
      });
    }

    async function success() {
      while (true) {
        try {
          await fetch({
            path: `/runtime/invocation/${awsRequestId}/response`,
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify("Job completed successfully"),
          });
          break;
        } catch (ex) {
          console.error(ex);
          await new Promise((resolve) => setTimeout(resolve, 500));
        }
      }
    }

    async function error() {
      return await fetch({
        path: `/runtime/invocation/${awsRequestId}/error`,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          errorType: "Error",
          errorMessage: "Failed to run job",
          trace: [],
        }),
      });
    }

    function fetch(req: {
      path: string;
      method: string;
      headers: Record<string, string>;
      body?: any;
    }) {
      return new Promise<{
        statusCode: number;
        headers: Record<string, any>;
        body: string;
      }>((resolve, reject) => {
        const request = http.request(
          input.url + req.path,
          {
            headers: req.headers,
            method: req.method,
          },
          (res) => {
            let body = "";
            res.setEncoding("utf8");
            res.on("data", (chunk) => {
              body += chunk.toString();
            });

            res.on("end", () => {
              resolve({
                statusCode: res.statusCode!,
                headers: res.headers,
                body,
              });
            });
          }
        );
        request.on("error", reject);
        if (req.body) request.write(req.body);
        request.end();
      });
    }
  }
});
