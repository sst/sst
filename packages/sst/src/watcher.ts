import { Context } from "./context/context.js";
import chokidar from "chokidar";
import { useBus } from "./bus.js";
import path from "path";
import { useProject } from "./project.js";

declare module "./bus.js" {
  export interface Events {
    "file.changed": {
      file: string;
      relative: string;
    };
  }
}

export const useWatcher = Context.memo(() => {
  const project = useProject();
  const bus = useBus();

  const watcher = chokidar.watch([project.paths.root], {
    persistent: true,
    ignoreInitial: true,
    followSymlinks: false,
    disableGlobbing: false,
    ignored: [
      "**/node_modules/**",
      "**/.build/**",
      "**/.sst/**",
      "**/.git/**",
      "**/debug.log",
    ],
    awaitWriteFinish: {
      pollInterval: 100,
      stabilityThreshold: 20,
    },
  });

  watcher.on("change", (file) => {
    bus.publish("file.changed", {
      file,
      relative: path.relative(project.paths.root, file),
    });
  });

  return {
    subscribe: bus.forward("file.changed"),
  };
});
