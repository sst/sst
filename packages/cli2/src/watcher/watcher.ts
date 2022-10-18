import { Context } from "@serverless-stack/node/context/context.js";
import { useProjectRoot } from "../config";
import chokidar from "chokidar";
import { useBus } from "../bus";
import { Logger } from "../logger/index.js";

declare module "../bus/index.js" {
  export interface Events {
    "file.changed": {
      file: string;
    };
  }
}

export const useWatcher = Context.memo(async () => {
  const [root, bus] = await Promise.all([useProjectRoot(), useBus()]);

  const watcher = chokidar.watch([root], {
    persistent: true,
    ignoreInitial: true,
    followSymlinks: false,
    disableGlobbing: false,
    ignored: [
      "**/node_modules/**",
      "**/.build/**",
      "**/.sst/**",
      "**/debug.log",
    ],
    awaitWriteFinish: {
      pollInterval: 100,
      stabilityThreshold: 20,
    },
  });

  watcher.on("change", (file) => {
    bus.publish("file.changed", { file });
  });

  return {
    subscribe: bus.forward("file.changed"),
  };
});
