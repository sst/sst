import path from "path";
import os from "os";
import { Paths } from "../util";

export type Opts = {
  srcPath: string;
  outPath: string;
  runtime: string;
  // Temporary
  transpiledHandler: any;
};

type Handler = (info: Opts) => Command;

type Command = {
  command: string;
  args: string[];
  env: Record<string, string>;
};

export const NodeRunner: Handler = (opts) => {
  const handler = path
    .join(opts.transpiledHandler.srcPath, opts.transpiledHandler.entry)
    .replace(".js", "." + opts.transpiledHandler.handler);
  return {
    command: "npx",
    args: ["aws-lambda-ric", handler],
    env: {
      AWS_LAMBDA_NODEJS_USE_ALTERNATIVE_CLIENT_1: "true",
    },
  };
};

export const GoRunner: Handler = (opts) => {
  return {
    command: opts.transpiledHandler.entry,
    args: [],
    env: {},
  };
};

export const PythonRunner: Handler = (opts) => {
  const PATH = (() => {
    if (process.env.VIRTUAL_ENV) {
      const runtimeDir = os.platform() === "win32" ? "Scripts" : "bin";
      return [
        path.join(process.env.VIRTUAL_ENV, runtimeDir),
        path.delimiter,
        process.env.PATH,
      ].join("");
    }

    return process.env.PATH!;
  })();

  return {
    command:
      os.platform() === "win32" ? "python.exe" : opts.runtime.split(".")[0],
    args: [
      "-u",
      path.join(Paths.OWN_PATH, "../src", "runtime", "shells", "bootstrap.py"),
      path
        .join(opts.transpiledHandler.srcPath, opts.transpiledHandler.entry)
        .split(path.sep)
        .join("."),
      opts.transpiledHandler.srcPath,
      opts.transpiledHandler.handler,
    ],
    env: {
      PATH,
    },
  };
};

export const DotnetRunner: Handler = (opts) => {
  return {
    command: "dotnet",
    args: [
      "exec",
      path.join(
        Paths.OWN_PATH,
        "../src/",
        "runtime",
        "shells",
        "dotnet-bootstrap",
        "release",
        "dotnet-bootstrap.dll"
      ),
      opts.transpiledHandler.entry,
      opts.transpiledHandler.handler,
    ],
    env: {},
  };
};

export function resolve(runtime: string): Handler {
  if (runtime.startsWith("node")) return NodeRunner;
  if (runtime.startsWith("go")) return GoRunner;
  if (runtime.startsWith("python")) return PythonRunner;
  if (runtime.startsWith("dotnetcore")) return DotnetRunner;
  throw new Error(`Unknown runtime ${runtime}`);
}
