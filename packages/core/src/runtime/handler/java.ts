import os from "os";
import path from "path";
import { State } from "../../state/index.js";
import { Paths } from "../../util/index.js";
import fs from "fs-extra";
import { buildAsync, buildSync, Command, Definition } from "./definition.js";

const BOOTSTRAP_MAP: Record<string, string> = {
  "java11": "java11-bootstrap",
};

export const JavaHandler: Definition = (opts: any) => {
  const dir = State.Function.artifactsPath(
    opts.root,
    path.join(opts.id, opts.srcPath)
  );
  const target = path.join(
    dir,
    path.basename(opts.handler).replace(/::/g, "-"),
  );
  const cmd: Command = {
    command: "gradle",
    args: [
      "build",
      `-Dorg.gradle.project.buildDir=${target}`,
      `-Dorg.gradle.logging.level=${process.env.DEBUG ? "debug" : "lifecycle"}`,
    ],
    env: {},
  };
  return {
    build: async () => {
      fs.mkdirpSync(dir);
      return buildAsync(opts, cmd);
    },
    bundle: () => {
      fs.removeSync(dir);
      fs.mkdirpSync(dir);
      buildSync(opts, cmd);
      return {
        handler: opts.handler,
        directory: `${target}/libs`,
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
            BOOTSTRAP_MAP[opts.runtime],
            "release",
            "*"
          ),
          path.join(
            target,
            "libs",
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
