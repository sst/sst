import http from "http";
import { spawn } from "child_process";
import { RuntimeHandler, StartWorkerInput } from "../handlers.js";
import { useRuntimeWorkers } from "../workers.js";
import { useRuntimeServerConfig } from "../server.js";
import { VisibleError } from "../../error.js";
import { isChild } from "../../util/fs.js";
import { execAsync } from "../../util/process.js";
import { useFunctions } from "../../constructs/Function.js";
import { lazy } from "../../util/lazy.js";

export const useContainerHandler = (): RuntimeHandler => {
  const containers = new Map<string, string>();
  const sources = new Map<string, string>();

  async function dockerRun(
    input: StartWorkerInput,
    opts: {
      entrypoint?: string;
      cmd?: string[];
      envs: Record<string, string>;
    },
    onExit: (code: number) => void
  ) {
    const workers = await useRuntimeWorkers();
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

  async function startLambdaWorker(input: StartWorkerInput) {
    const server = await useRuntimeServerConfig();
    const workers = await useRuntimeWorkers();
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
    const workers = await useRuntimeWorkers();
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
      await dockerRun(
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
  return {
    shouldBuild: (input) => {
      const parent = sources.get(input.functionID);
      if (!parent) return false;
      return isChild(parent, input.file);
    },
    canHandle: (input) => input.startsWith("container"),
    startWorker: async (input) => {
      input.environment.SST_DEBUG_JOB
        ? await startJobWorker(input)
        : await startLambdaWorker(input);
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
            [
              `docker build`,
              `-t sst-dev:${input.functionID}`,
              ...(input.props.container?.file
                ? [`-f ${input.props.container.file}`]
                : []),
              ...Object.entries(input.props.container?.buildArgs || {}).map(
                ([k, v]) => `--build-arg ${k}=${v}`
              ),
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
              ...(input.props.container?.file
                ? [`-f ${input.props.container.file}`]
                : []),
              ...Object.entries(input.props.container?.buildArgs || {}).map(
                ([k, v]) => `--build-arg ${k}=${v}`
              ),
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
  };
};
