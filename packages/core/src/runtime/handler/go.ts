import path from "path";
import { State } from "../../state";
import { Definition, Command, buildSync, buildAsync } from "./definition";

export const GoHandler: Definition = (opts) => {
  const artifact = State.Function.artifactsPath(opts.root, opts.id);
  const target = path.join(
    artifact,
    path.dirname(opts.handler),
    path.basename(opts.handler).split(".")[0]
  );
  const build: Command = {
    command: "go",
    args: ["build", "-ldflags", "-s -w", "-o", target, opts.handler],
    env: {},
  };
  return {
    build: () => buildAsync(opts, build),
    bundle: () => {
      buildSync(opts, {
        ...build,
        env: {
          CGO_ENABLED: "0",
          GOOS: "linux",
        },
      });
      return {
        handler: opts.handler,
        directory: artifact,
      };
    },
    run: {
      command: target,
      args: [],
      env: {},
    },
    watcher: {
      include: [path.join(opts.srcPath, "**/*.go")],
      ignore: [],
    },
  };
};
