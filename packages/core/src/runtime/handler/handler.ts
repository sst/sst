import { Definition, Opts } from "./definition";

import { NodeHandler } from "./node";
import { GoHandler } from "./go";
import { PythonHandler } from "./python";
import { DotnetHandler } from "./dotnet";

export { Opts, Instructions } from "./definition";

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
  if (runtime.startsWith("dotnetcore")) return DotnetHandler;
  throw new Error(`Unknown runtime ${runtime}`);
}

export function instructions(opts: Opts) {
  const handler = resolve(opts.runtime);
  return handler(opts);
}
