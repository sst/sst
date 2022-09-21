import chalk, { ChalkInstance } from "chalk";

type Colors = {
  [key in keyof typeof chalk]: typeof chalk[key] extends ChalkInstance
    ? key
    : never;
}[keyof typeof chalk];

let previous = new Date();
export const Logger = {
  ui<T extends Colors>(color: T, ...lines: string[]) {
    console.log(chalk[color](lines.join("\n")));
  },
  debug(...parts: any[]) {
    const now = new Date();
    const diff = now.getTime() - previous.getTime();
    previous = now;
    console.log(
      new Date().toISOString(),
      `+${diff}ms`.padStart(8),
      "[debug]",
      ...parts
    );
  }
};
