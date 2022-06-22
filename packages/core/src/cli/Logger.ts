export * as Logger from "./Logger.js";

const LEVELS = {
  debug: 1,
  info: 0,
};

let Level = LEVELS.info;

export function print(level: keyof typeof LEVELS, ...args: any[]) {
  if (Level < LEVELS[level]) return;
  console.log(...args);
}

export function setLevel(level: keyof typeof LEVELS) {
  Level = LEVELS[level];
}
