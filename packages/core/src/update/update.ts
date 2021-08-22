import fs from "fs";
import path from "path";
import spawn from "cross-spawn";
import chalk = require("chalk");
import { Packager } from "../packager";

type RunOpts = {
  rootDir: string;
  verbose: boolean;
};

export function run(opts: RunOpts) {
  const manager = Packager.getManager(opts.rootDir);
  const json = JSON.parse(
    fs.readFileSync(path.join(opts.rootDir, "package.json")).toString()
  );

  for (const pkg of [
    "@serverless-stack/cli",
    "@serverless-stack/resources",
  ] as const) {
    if (!opts.verbose) console.log(chalk.gray("Updating", pkg));
    manager.add({
      cwd: opts.rootDir,
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
    manager.add({
      type,
      cwd: opts.rootDir,
      pkgs: updates,
      verbose: opts.verbose,
    });
  }

  console.log(`SST: ${compare.version}\nCDK: ${version}`);
}
