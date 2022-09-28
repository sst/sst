import os from "os";
import path from "path";
import fs from "fs-extra";
import zipLocal from "zip-local";
import * as lambda from "aws-cdk-lib/aws-lambda";
import { State } from "../../state/index.js";
import { Paths } from "../../util/index.js";
import { buildAsync, buildAsyncAndThrow, Command, Definition, Opts } from "./definition.js";
import { Lambda } from "aws-sdk";

// Keep in sync manually with packages/resources/src/Function.ts:FunctionBundleJavaProps
type Bundle = {
  customRuntime?: boolean;
  buildCommand?: string;
  buildOutputFolder?: string;
};

export const JavaHandler: Definition = (opts: Opts<Bundle>) => {
  // Check build.gradle exists
  const buildGradle = path.join(opts.srcPath, "build.gradle");
  if (!fs.existsSync(buildGradle)) {
    throw new Error("Cannot find build.gradle at " + buildGradle);
  }

  // Use a gradle wrapper if provided in the folder, otherwise fall back to system "gradle"
  const gradleWrapperPath = path.resolve(path.join(opts.srcPath, "gradlew"));
  const gradleBinary = fs.existsSync(gradleWrapperPath) ? gradleWrapperPath : "gradle"

  const bundle = opts.bundle || {
  };
  const buildOutputFolder = bundle.buildOutputFolder ?? "distributions";

  const dir = State.Function.artifactsPath(
    opts.root,
    path.join(opts.id, opts.srcPath)
  );
  const target = path.join(
    dir,
    path.basename(opts.handler).replace(/::/g, "-"),
  );
  const cmd: Command = {
    command: gradleBinary,
    args: [
      bundle.buildCommand ?? "build",
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
        const zip = (await fs.readdir(`${target}/${buildOutputFolder}`)).find((f) => f.endsWith(".zip"));
        zipLocal.sync.unzip(`${target}/${buildOutputFolder}/${zip}`).save(`${target}/${buildOutputFolder}`);
      }
      return issues;
    },
    bundle: async () => {
      await fs.remove(dir);
      await fs.mkdirp(dir);
      await buildAsyncAndThrow(opts, cmd);
      // Find the first zip in the build directory
      const zip = (await fs.readdir(`${target}/${buildOutputFolder}`)).find((f) => f.endsWith(".zip"));
      return {
        handler: opts.handler,
        asset: lambda.Code.fromAsset(`${target}/${buildOutputFolder}/${zip}`),
        overrideRuntime: bundle.customRuntime ? lambda.Runtime.PROVIDED_AL2 : undefined
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
            `${buildOutputFolder}`,
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
