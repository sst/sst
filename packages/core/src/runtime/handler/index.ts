export * as Handler from "./index.js";

import { Definition, Opts } from "./definition.js";

import { NodeHandler } from "./node.js";
import { GoHandler } from "./go.js";
import { PythonHandler } from "./python.js";
import { DotnetHandler } from "./dotnet.js";

export { Opts, Instructions } from "./definition.js";

export async function build(opts: Opts) {
  const instructions = resolve(opts.runtime)(opts);
  if (!instructions.build) return;
  return instructions.build();
}

export function bundle(opts: Opts) {
  const ins = instructions(opts);
  if (!ins.bundle) return;
  return ins.bundle();
}

export function resolve(runtime: string): Definition {
  if (runtime.startsWith("node")) return NodeHandler;
  if (runtime.startsWith("go")) return GoHandler;
  if (runtime.startsWith("python")) return PythonHandler;
  if (runtime.startsWith("dotnet")) return DotnetHandler;
  throw new Error(`Unknown runtime ${runtime}`);
}

export function instructions(opts: Opts) {
  const handler = resolve(opts.runtime);
  return handler(opts);
}
