import util from "util";

export function log(...args: any[]): void {
  //console.log("[sst]", ...args);
  console.log(...args);
}

export function error(...args: any[]): void {
  console.error(...args);
}
