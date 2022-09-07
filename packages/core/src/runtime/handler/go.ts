import path from "path";
import fs from "fs-extra";
import { State } from "../../state/index.js";
import { Definition, buildAsync, buildAsyncAndThrow } from "./definition.js";

export const GoHandler: Definition = opts => {
  const artifact = State.Function.artifactsPath(opts.root, opts.id);
  const target = path.join(artifact, "handler");

  const full = path.join(opts.srcPath, opts.handler);
  if (!fs.existsSync(path.join(full)))
    throw new Error("Cannot find handler at " + full);

  const platformTarget =
    process.platform === "win32" ? `${target}.exe` : target;

  return {
    build: async () => {
      await fs.remove(artifact);
      await fs.mkdirp(artifact);
      return await buildAsync(opts, {
        command: "go",
        args: [
          "build",
          "-ldflags",
          "-s -w",
          "-o",
          platformTarget,
          "./" + opts.handler
        ],
        env: {}
      });
    },
    bundle: async () => {
      await fs.remove(artifact);
      await fs.mkdirp(artifact);
      await buildAsyncAndThrow(opts, {
        command: "go",
        args: ["build", "-ldflags", "-s -w", "-o", target, "./" + opts.handler],
        env: {
          CGO_ENABLED: "0",
          GOARCH: "amd64",
          GOOS: "linux"
        }
      });
      return {
        handler: "handler",
        directory: artifact
      };
    },
    run: {
      command: platformTarget,
      args: [],
      env: {}
    },
    watcher: {
      include: [path.join(opts.srcPath, "**/*.go")],
      ignore: []
    }
  };
};
