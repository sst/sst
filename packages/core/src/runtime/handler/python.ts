import { Definition } from "./definition";
import os from "os";
import path from "path";
import { Paths } from "../../util/index.js";
import { bundle as bundlePython } from "./pythonBundling.js";
import * as lambda from "aws-cdk-lib/aws-lambda";

const RUNTIME_MAP: Record<string, lambda.Runtime> = {
  "python2.7": lambda.Runtime.PYTHON_2_7,
  "python3.6": lambda.Runtime.PYTHON_3_6,
  "python3.7": lambda.Runtime.PYTHON_3_7,
  "python3.8": lambda.Runtime.PYTHON_3_8,
  "python3.9": lambda.Runtime.PYTHON_3_9,
};

export const PythonHandler: Definition = (opts) => {
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
  const dir = path.dirname(opts.handler);
  const [base, ext] = path.basename(opts.handler).split(".");
  const target = path.join(opts.srcPath, dir, base);

  return {
    build: async () => [],
    bundle: () => {
      //const artifact =
      // State.Function.artifactsPath(opts.root, opts.id) + ".zip";
      const asset = bundlePython({
        installCommands: opts.bundle && opts.bundle.installCommands,
        runtime: RUNTIME_MAP[opts.runtime],
        entry: opts.srcPath,
        outputPathSuffix: ".",
      });

      return {
        asset,
        handler: opts.handler,
      };
    },
    run: {
      command:
        os.platform() === "win32" ? "python.exe" : opts.runtime.split(".")[0],
      args: [
        "-u",
        path.join(
          Paths.OWN_PATH,
          "../src",
          "runtime",
          "shells",
          "bootstrap.py"
        ),
        target.split(path.sep).join("."),
        opts.srcPath,
        ext,
      ],
      env: {
        PATH,
      },
    },
    watcher: {
      include: [path.join(opts.srcPath, "**/*.py")],
      ignore: [],
    },
  };
};
