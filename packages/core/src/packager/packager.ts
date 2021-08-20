import spawn from "cross-spawn";
import path from "path";
import fs from "fs";

type UpdateOpts = {
  type: "dependencies" | "devDependencies";
  cwd: string;
  pkgs: string[];
  verbose: boolean;
};

type ManagerImplementation<T extends string> = {
  type: T;
  add(opts: UpdateOpts): void;
};

const NPM: ManagerImplementation<"npm"> = {
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
};

const Yarn: ManagerImplementation<"yarn"> = {
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
};

type Manager = typeof NPM | typeof Yarn;

export function getManager(dir: string): Manager {
  const lock = path.join(dir, "yarn.lock");
  if (fs.existsSync(lock)) return Yarn;
  if (dir === "/") return NPM;
  return getManager(path.resolve(dir, ".."));
}

const x = getManager(process.cwd());
