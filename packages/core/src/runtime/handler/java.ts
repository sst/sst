import os from "os";
import path from "path";
import fs from "fs-extra";
import zipLocal from "zip-local";
import * as lambda from "aws-cdk-lib/aws-lambda";
import { State } from "../../state/index.js";
import { Paths } from "../../util/index.js";
import { buildAsync, buildAsyncAndThrow, Command, Definition } from "./definition.js";

type Bundle = {
  buildTask?: string;
  buildOutputDir?: string;
};

export const JavaHandler: Definition<Bundle> = opts => {
  // Check build.gradle exists
  const buildGradle = path.join(opts.srcPath, "build.gradle");
  if (!fs.existsSync(buildGradle)) {
    throw new Error("Cannot find build.gradle at " + buildGradle);
  }

  const buildBinary = getGradleBinary(opts.srcPath);
  const buildTask = getGradleBuildTask(opts.bundle || {});
  const outputDir = getGradleBuildOutputDir(opts.bundle || {});

  const dir = State.Function.artifactsPath(
    opts.root,
    path.join(opts.id, opts.srcPath)
  );
  const target = path.join(
    dir,
    path.basename(opts.handler).replace(/::/g, "-"),
  );
  const cmd: Command = {
    command: buildBinary,
    args: [
      buildTask,
      `-Dorg.gradle.project.buildDir=${target}`,
      `-Dorg.gradle.logging.level=${process.env.DEBUG ? "debug" : "lifecycle"}`,
    ],
    env: {},
  };

  // After running `gradle build`, the build directory has the structure:
  //  build/
  //    distributions/
  //      java-lambda-hello-world-0.0.1.tar
  //      java-lambda-hello-world-0.0.1.zip
  //    libs/
  //      java-lambda-hello-world-0.0.1.jar
  //
  // On `sst deploy`, we use "distributions/java-lambda-hello-world-0.0.1.zip" as the Lambda artifact.
  // On `sst start`, we unzip "distributions/java-lambda-hello-world-0.0.1.zip" to "distributions" and
  //   include "distributions/lib/*" in the class path.

  return {
    build: async () => {
      await fs.mkdirp(dir);
      const issues = await buildAsync(opts, cmd);
      if (issues.length === 0) {
        // Unzip dependencies from .zip
        const zip = (await fs.readdir(`${target}/${outputDir}`)).find((f) => f.endsWith(".zip"));
        zipLocal.sync.unzip(`${target}/${outputDir}/${zip}`).save(`${target}/${outputDir}`);
      }
      return issues;
    },
    bundle: async () => {
      await fs.remove(dir);
      await fs.mkdirp(dir);
      await buildAsyncAndThrow(opts, cmd);
      // Find the first zip in the build directory
      const zip = (await fs.readdir(`${target}/${outputDir}`)).find((f) => f.endsWith(".zip"));
      return {
        handler: opts.handler,
        asset: lambda.Code.fromAsset(`${target}/${outputDir}/${zip}`),
      };
    },
    run: {
      command: "java",
      args: [
        "-cp",
        [
          path.join(
            Paths.OWN_PATH,
            "../src/",
            "runtime",
            "shells",
            "java-bootstrap",
            "release",
            "*"
          ),
          path.join(
            target,
            "libs",
            "*"
          ),
          path.join(
            target,
            outputDir,
            "lib",
            "*"
          ),
        ].join(os.platform() === "win32" ? ";" : ":"),
        "com.amazonaws.services.lambda.runtime.api.client.AWSLambda",
        opts.handler,
      ],
      env: {},
    },
    watcher: {
      include: [
        path.join(opts.srcPath, "**/*.java"),
        path.join(opts.srcPath, "**/*.gradle"),
      ],
      ignore: [],
    },
  };
};

function getGradleBinary(srcPath: string): string {
  // Use a gradle wrapper if provided in the folder, otherwise fall back
  // to system "gradle"
  const gradleWrapperPath = path.resolve(path.join(srcPath, "gradlew"));
  return fs.existsSync(gradleWrapperPath) ? gradleWrapperPath : "gradle";
}

function getGradleBuildTask(bundle: Bundle): string {
  return (bundle && bundle.buildTask) || "build";
}

function getGradleBuildOutputDir(bundle: Bundle): string {
  return (bundle && bundle.buildOutputDir) || "distributions";
}