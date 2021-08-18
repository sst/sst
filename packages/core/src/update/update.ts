import fs from "fs";
import path from "path";
import spawn from "cross-spawn";
import chalk = require("chalk");

type RunOpts = {
  rootDir: string;
  verbose: boolean;
};

export function run(opts: RunOpts) {
  const manager = fs.existsSync(path.join(opts.rootDir, "yarn.lock"))
    ? Yarn
    : NPM;
  const json = JSON.parse(
    fs.readFileSync(path.join(opts.rootDir, "package.json")).toString()
  );

  for (const pkg of [
    "@serverless-stack/cli",
    "@serverless-stack/resources",
  ] as const) {
    if (!opts.verbose) console.log(chalk.gray("Updating", pkg));
    manager.update({
      root: opts.rootDir,
      type: json.dependencies?.[pkg] ? "dependencies" : "devDependencies",
      pkgs: [`${pkg}@latest`],
      verbose: opts.verbose,
    });
  }

  // eslint-disable-next-line
  const compare = require("@serverless-stack/core/package.json");
  const version = compare.dependencies["aws-cdk"];

  for (const type of ["dependencies", "devDependencies"] as const) {
    const updates = Object.keys(json[type] || {})
      .filter((key) => /^@?aws-cdk/.test(key))
      .map((key) => `${key}@${version}`);
    if (!updates.length) continue;
    if (!opts.verbose)
      updates.forEach((pkg) => console.log(chalk.gray("Updating", pkg)));
    manager.update({
      type,
      root: opts.rootDir,
      pkgs: updates,
      verbose: opts.verbose,
    });
  }

  console.log(`SST: ${compare.version}\nCDK: ${version}`);
}

type UpdateOpts = {
  type: "dependencies" | "devDependencies";
  root: string;
  pkgs: string[];
  verbose: boolean;
};

type PackageManager = {
  update: (opts: UpdateOpts) => void;
};

const NPM: PackageManager = {
  update(opts) {
    return spawn.sync(
      "npm",
      [
        "install",
        "--save-exact",
        ...opts.pkgs,
        opts.type === "dependencies" ? "--save" : "--save-dev",
      ],
      {
        cwd: opts.root,
        stdio: opts.verbose ? "inherit" : undefined,
      }
    );
  },
};

const Yarn: PackageManager = {
  update(opts) {
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
        cwd: opts.root,
        stdio: opts.verbose ? "inherit" : undefined,
      }
    );
  },
};
