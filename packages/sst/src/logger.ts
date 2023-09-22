import fs from "fs";
import path from "path";
import { useProject } from "./project.js";
import { lazy } from "./util/lazy.js";

let previous = new Date();

const useFile = lazy(() => {
  const project = useProject();
  const filePath = path.join(project.paths.out, "debug.log");
  const file = fs.createWriteStream(filePath);
  return file;
});

export const Logger = {
  debug(...parts: any[]) {
    const now = new Date();
    const diff = now.getTime() - previous.getTime();
    previous = now;
    const line = [
      new Date().toISOString(),
      `+${diff}ms`.padStart(8),
      "[debug]",
      ...parts.map((x) => {
        if (typeof x === "string") return x;
        return JSON.stringify(x);
      }),
    ];
    if (process.env.SST_VERBOSE) console.log(...line);
    const file = useFile();
    file.write(line.join(" ") + "\n");
  },
};
