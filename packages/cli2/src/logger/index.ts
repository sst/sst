import chalk, { ChalkInstance } from "chalk";

type Colors = {
  [key in keyof typeof chalk]: typeof chalk[key] extends ChalkInstance
    ? key
    : never;
}[keyof typeof chalk];

export const Logger = {
  ui<T extends Colors>(color: T, ...lines: string[]) {
    console.log(chalk[color](lines.join("\n")));
  },
  debug(...parts: any[]) {
    console.log(...parts);
  },
};
