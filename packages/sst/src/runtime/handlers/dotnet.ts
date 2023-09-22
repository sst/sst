import { RuntimeHandler } from "../handlers.js";
import { useRuntimeWorkers } from "../workers.js";
import { ChildProcessWithoutNullStreams, spawn } from "child_process";
import { useRuntimeServerConfig } from "../server.js";
import { findBelow, isChild } from "../../util/fs.js";
import { useProject } from "../../project.js";
import { execAsync } from "../../util/process.js";
import url from "url";
import { lazy } from "../../util/lazy.js";

const FRAMEWORK_MAP: Record<string, string> = {
  "dotnetcore1.0": "netcoreapp3.1",
  "dotnetcore2.0": "netcoreapp3.1",
  "dotnetcore2.1": "netcoreapp3.1",
  "dotnetcore3.1": "netcoreapp3.1",
  dotnet6: "net6.0",
};

const BOOTSTRAP_MAP: Record<string, string> = {
  "dotnetcore1.0": "dotnet31-bootstrap",
  "dotnetcore2.0": "dotnet31-bootstrap",
  "dotnetcore2.1": "dotnet31-bootstrap",
  "dotnetcore3.1": "dotnet31-bootstrap",
  dotnet6: "dotnet6-bootstrap",
};

export const useDotnetHandler = (): RuntimeHandler => {
  const processes = new Map<string, ChildProcessWithoutNullStreams>();
  const sources = new Map<string, string>();
  const handlerName = process.platform === "win32" ? `handler.exe` : `handler`;

  return {
    shouldBuild: (input) => {
      if (!input.file.endsWith(".cs") && !input.file.endsWith(".fs"))
        return false;
      const parent = sources.get(input.functionID);
      if (!parent) return false;
      return isChild(parent, input.file);
    },
    canHandle: (input) => input.startsWith("dotnet"),
    startWorker: async (input) => {
      const workers = await useRuntimeWorkers();
      const server = await useRuntimeServerConfig();
      const name = input.handler!.split(":")[0];
      const proc = spawn(
        `dotnet`,
        [
          `exec`,
          url.fileURLToPath(
            new URL(
              `../../support/${
                BOOTSTRAP_MAP[input.runtime]
              }/release/dotnet-bootstrap.dll`,
              import.meta.url
            )
          ),
          name + ".dll",
          input.handler,
        ],
        {
          env: {
            ...process.env,
            ...input.environment,
            IS_LOCAL: "true",
            AWS_LAMBDA_RUNTIME_API: `localhost:${server.port}/${input.workerID}`,
            AWS_LAMBDA_DOTNET_DEBUG_RUN_ONCE: "true",
          },
          cwd: input.out,
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
      const project = useProject();
      const name = input.props.handler!.split(":")[0];
      const srcPath = await findBelow(project.paths.root, `${name}.csproj`);
      sources.set(input.functionID, srcPath);

      try {
        await execAsync(
          [
            "dotnet",
            "publish",
            "--output",
            '"' + input.out + '"',
            "--configuration",
            "Release",
            "--framework",
            FRAMEWORK_MAP[input.props.runtime!],
            "/p:GenerateRuntimeConfigurationFiles=true",
            "/clp:ForceConsoleColor",
            // warnings are not reported for repeated builds by default and this flag
            // does a clean before build. It takes a little longer to run, but the
            // warnings are consistently printed on each build.
            //"/target:Rebuild",
            "--self-contained",
            "false",
            // do not print "Build Engine version"
            "-nologo",
          ].join(" "),
          // only print errors
          {
            cwd: srcPath,
          }
        );

        return {
          type: "success",
          handler: input.props.handler!,
          runtime: input.props.runtime,
        };
      } catch (ex: any) {
        return {
          type: "error",
          errors: [ex.stderr],
        };
      }
    },
  };
};
