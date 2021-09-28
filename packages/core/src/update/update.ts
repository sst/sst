import fs from "fs-extra";
import path from "path";
import chalk from "chalk";
import { Packager } from "../packager";

type RunOpts = {
  rootDir: string;
  verbose: boolean;
  version?: string;
};

export function run(opts: RunOpts) {
  const manager = Packager.getManager(opts.rootDir);
  const json = JSON.parse(
    fs.readFileSync(path.join(opts.rootDir, "package.json")).toString()
  );
  const version = opts.version || "latest";
  for (const pkg of [
    "@serverless-stack/cli",
    "@serverless-stack/resources",
  ] as const) {
    if (!opts.verbose) console.log(chalk.gray("Updating", pkg, "to", version));
    manager.add({
      cwd: opts.rootDir,
      type: json.dependencies?.[pkg] ? "dependencies" : "devDependencies",
      pkgs: [`${pkg}@${version}`],
      verbose: opts.verbose,
    });
  }

  const module = "@serverless-stack/core/package.json";
  const compare = fs.readJsonSync(require.resolve(module));
  const cdkVersion = compare.dependencies["aws-cdk"];

  for (const type of ["dependencies", "devDependencies"] as const) {
    const updates = Object.keys(json[type] || {})
      .filter((key) => /^@?aws-cdk/.test(key))
      .map((key) => `${key}@${cdkVersion}`);
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

  console.log(`SST: ${compare.version}\nCDK: ${cdkVersion}`);
}
