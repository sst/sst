import { Context } from "@serverless-stack/node/context/index.js";
import chalk, { ChalkInstance } from "chalk";
import fs from "fs/promises";
import path from "path";
import { useStateDirectory } from "../state";

type Colors = {
  [key in keyof typeof chalk]: typeof chalk[key] extends ChalkInstance
    ? key
    : never;
}[keyof typeof chalk];

let previous = new Date();

const filePath = path.join("debug.log");
const file = await fs.open(filePath, "w");

export const Logger = {
  ui<T extends Colors>(color: T, ...lines: string[]) {
    console.log(chalk[color](lines.join("\n")));
  },
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
