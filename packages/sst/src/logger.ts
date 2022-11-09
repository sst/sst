import chalk from "colorette";
import fs from "fs/promises";
import path from "path";

let previous = new Date();

const filePath = path.join("debug.log");
const file = await fs.open(filePath, "w");

export const Logger = {
  async debug(...parts: any[]) {
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
    file.write(line.join(" ") + "\n");
  },
};
