import path from "path";
import fs from "fs/promises";
import os from "os";
import { RuntimeHandler } from "../handlers.js";
import { useRuntimeWorkers } from "../workers.js";
import { ChildProcessWithoutNullStreams, spawn } from "child_process";
import { useRuntimeServerConfig } from "../server.js";
import { existsAsync, findBelow, isChild } from "../../util/fs.js";
import { useProject } from "../../project.js";
import { execAsync } from "../../util/process.js";
import url from "url";
import AdmZip from "adm-zip";

export const useJavaHandler = (): RuntimeHandler => {
  const processes = new Map<string, ChildProcessWithoutNullStreams>();
  const sources = new Map<string, string>();
  const runningBuilds = new Map<string, ReturnType<typeof execAsync>>();

  return {
    shouldBuild: (input) => {
      if (!input.file.endsWith(".java")) return false;
      const parent = sources.get(input.functionID);
      if (!parent) return false;
      return isChild(parent, input.file);
    },
    canHandle: (input) => input.startsWith("java"),
    startWorker: async (input) => {
      const workers = await useRuntimeWorkers();
      const server = await useRuntimeServerConfig();
      const proc = spawn(
        `java`,
        [
          `-cp`,
          [
            url.fileURLToPath(
              new URL("../../support/java-runtime/release/*", import.meta.url)
            ),
          ].join(os.platform() === "win32" ? ";" : ":"),
          "com.amazonaws.services.lambda.runtime.api.client.AWSLambda",
          input.handler,
        ],
        {
          env: {
            ...process.env,
            ...input.environment,
            IS_LOCAL: "true",
            AWS_LAMBDA_RUNTIME_API: `localhost:${server.port}/${input.workerID}`,
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
      const srcPath = await findBelow(project.paths.root, "build.gradle");
      const buildBinary = await getGradleBinary(srcPath);
      const buildTask = input.props.java?.buildTask || "build";
      const outputDir = input.props.java?.buildOutputDir || "distributions";
      sources.set(input.functionID, srcPath);

      try {
        // Build
        // Note: run gradle build once per directory. Otherwise they'll interfere
        // with one another
        const buildPromise =
          runningBuilds.get(buildBinary) ??
          execAsync(
            `${buildBinary} ${buildTask} -Dorg.gradle.logging.level=${
              process.env.DEBUG ? "debug" : "lifecycle"
            }`,
            {
              cwd: srcPath,
            }
          );
        runningBuilds.set(buildBinary, buildPromise);
        await buildPromise;
        runningBuilds.delete(buildBinary);

        // unzip
        const buildOutput = path.join(srcPath, "build", outputDir);
        const zip = (await fs.readdir(buildOutput)).find((f) =>
          f.endsWith(".zip")
        )!;
        const zipper = new AdmZip(path.join(buildOutput, zip));
        zipper.extractAllTo(input.out, false, false);

        return {
          type: "success",
          handler: input.props.handler!,
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

async function getGradleBinary(srcPath: string) {
  // Use a gradle wrapper if provided in the folder, otherwise fall back
  // to system "gradle"
  const gradleWrapperPath = path.resolve(path.join(srcPath, "gradlew"));
  return (await existsAsync(gradleWrapperPath)) ? gradleWrapperPath : "gradle";
}
