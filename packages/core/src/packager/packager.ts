import spawn from "cross-spawn";
import path from "path";
import fs from "fs";

type Manager = typeof NPM | typeof Yarn;

type UpdateOpts = {
  type: "dependencies" | "devDependencies";
  cwd: string;
  pkgs: string[];
  verbose: boolean;
};

const NPM = {
  type: "npm" as const,
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
};

const Yarn = {
  type: "yarn" as const,
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
};

export function getManager(dir: string): Manager {
  const lock = path.join(dir, "yarn.lock");
  if (fs.existsSync(lock)) return Yarn;
  if (dir === "/") return NPM;
  return getManager(path.resolve(dir, ".."));
}
