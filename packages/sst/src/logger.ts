import fs from "fs/promises";
import path from "path";
import { Context } from "./context/context.js";
import { useProject } from "./project.js";

let previous = new Date();

const useFile = Context.memo(async () => {
  const project = useProject();
  const filePath = path.join(project.paths.out, "debug.log");
  const file = await fs.open(filePath, "w");
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
    useFile().then((file) => {
      file.write(line.join(" ") + "\n");
    });
  },
};
