import path from "path";
import { State } from "../../state/index.js";
import { Paths } from "../../util/index.js";
import fs from "fs-extra";
import { buildAsync, buildSync, Command, Definition } from "./definition.js";

const FRAMEWORK_MAP: Record<string, string> = {
  "dotnetcore1.0": "netcoreapp3.1",
  "dotnetcore2.0": "netcoreapp3.1",
  "dotnetcore2.1": "netcoreapp3.1",
  "dotnetcore3.1": "netcoreapp3.1",
  "dotnet6": "net6.0",
};

const BOOTSTRAP_MAP: Record<string, string> = {
  "dotnetcore1.0": "dotnet31-bootstrap",
  "dotnetcore2.0": "dotnet31-bootstrap",
  "dotnetcore2.1": "dotnet31-bootstrap",
  "dotnetcore3.1": "dotnet31-bootstrap",
  "dotnet6": "dotnet6-bootstrap",
};

export const DotnetHandler: Definition = (opts: any) => {
  const dir = State.Function.artifactsPath(
    opts.root,
    path.join(opts.id, opts.srcPath)
  );
  const target = path.join(
    dir,
    path.basename(opts.handler).split(":")[0] + ".dll"
  );
  const cmd: Command = {
    command: "dotnet",
    args: [
      "publish",
      "--output",
      dir,
      "--configuration",
      "Release",
      "--framework",
      FRAMEWORK_MAP[opts.runtime],
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
      // only print errors
      "--verbosity",
      process.env.DEBUG ? "minimal" : "quiet",
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
        directory: dir,
      };
    },
    run: {
      command: "dotnet",
      args: [
        "exec",
        path.join(
          Paths.OWN_PATH,
          "../src/",
          "runtime",
          "shells",
          BOOTSTRAP_MAP[opts.runtime],
          "release",
          "dotnet-bootstrap.dll"
        ),
        target,
        opts.handler,
      ],
      env: {
        AWS_LAMBDA_DOTNET_DEBUG_RUN_ONCE: "true",
      },
    },
    watcher: {
      include: [
        path.join(opts.srcPath, "**/*.cs"),
        path.join(opts.srcPath, "**/*.csx"),
      ],
      ignore: [],
    },
  };
};
