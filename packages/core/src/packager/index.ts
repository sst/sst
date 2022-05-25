import spawn from "cross-spawn";
import path from "path";
import fs from "fs";

export * as Packager from "./index.js";

type UpdateOpts = {
  type: "dependencies" | "devDependencies";
  cwd: string;
  pkgs: string[];
  verbose: boolean;
};

function Implementation<T extends string>(impl: {
  type: T;
  add: (opts: UpdateOpts) => void;
}) {
  return impl;
}

const NPM = Implementation({
  type: "npm",
  add(opts: UpdateOpts) {
    return spawn.sync(
      "npm",
      [
        "install",
        "--save-exact",
        ...opts.pkgs,
        opts.type === "dependencies" ? "--save" : "--save-dev",
      ],
      {
        cwd: opts.cwd,
        stdio: opts.verbose ? "inherit" : undefined,
      }
    );
  },
});

const Yarn = Implementation({
  type: "yarn",
  add(opts: UpdateOpts) {
    return spawn.sync(
      "yarn",
      [
        "add",
        "--exact",
        (opts.type === "devDependencies" && "--dev") || "",
        "-W",
        ...opts.pkgs,
      ].filter((item) => item),
      {
        cwd: opts.cwd,
        stdio: opts.verbose ? "inherit" : undefined,
      }
    );
  },
});

type Manager = typeof NPM | typeof Yarn;

export function getManager(dir: string): Manager {
  const lock = path.join(dir, "yarn.lock");
  if (fs.existsSync(lock)) return Yarn;
  const upDir = path.resolve(dir, "..");
  if (upDir === dir) {
    return NPM;
  }
  return getManager(upDir);
}
