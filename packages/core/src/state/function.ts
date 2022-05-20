import { resolve } from "./index.js";
import path from "path";
import fs from "fs-extra";
import { Runtime } from "../runtime";

const FILE_NAME = "functions.jsonl";

export function reset(root: string) {
  fs.removeSync(definitionsPath(root));
}

export function append(root: string, def: Omit<Runtime.Handler.Opts, "root">) {
  fs.appendFileSync(
    definitionsPath(root),
    JSON.stringify({
      ...def,
      root,
    }) + "\n"
  );
}

export function read(root: string): Runtime.Handler.Opts[] {
  if (!fs.existsSync(definitionsPath(root))) return [];
  const data = fs.readFileSync(definitionsPath(root), "utf8");
  return data
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

function definitionsPath(root: string) {
  return resolve(root, FILE_NAME);
}

export function artifactsPath(root: string, target: string) {
  return resolve(root, path.join("artifacts", target));
}
