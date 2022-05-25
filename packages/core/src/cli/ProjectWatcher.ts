import { Bus } from "./Bus.js";
import chokidar from "chokidar";

declare module "./Bus" {
  export interface Events {
    "file.changed": {
      file: string;
    };
  }
}

interface Opts {
  bus: Bus;
  root: string;
}
export function createProjectWatcher(opts: Opts) {
  const watch = chokidar.watch(opts.root, {
    persistent: true,
    ignoreInitial: true,
    followSymlinks: false,
    disableGlobbing: false,
    ignored: ["**/node_modules/**", "**/.build/**", "**/.sst/**"],
    awaitWriteFinish: {
      pollInterval: 100,
      stabilityThreshold: 20,
    },
  });

  watch.on("change", (file) => {
    opts.bus.publish("file.changed", { file });
  });
}
