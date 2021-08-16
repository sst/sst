import fs from "fs";
import path from "path";
import spawn from "cross-spawn";

export function run(rootDir: string) {
  const manager = fs.existsSync(path.join(rootDir, "yarn.lock")) ? Yarn : NPM;
  const json = JSON.parse(
    fs.readFileSync(path.join(rootDir, "package.json")).toString()
  );

  for (const pkg of [
    "@serverless-stack/cli",
    "@serverless-stack/resources",
  ] as const) {
    manager.update({
      root: rootDir,
      type: json.dependencies?.[pkg] ? "dependencies" : "devDependencies",
      pkgs: [`${pkg}@latest`],
    });
  }

  // eslint-disable-next-line
  const compare = require("@serverless-stack/core/package.json");
  const version = compare.dependencies["aws-cdk"];

  for (const type of ["dependencies", "devDependencies"] as const) {
    const updates = Object.keys(json[type] || {})
      .filter((key) => /^@?aws-cdk/.test(key))
      .map((key) => `${key}@${version}`);
    if (!updates.length) return;
    manager.update({
      type,
      root: rootDir,
      pkgs: updates,
    });
  }
}

type UpdateOpts = {
  type: "dependencies" | "devDependencies";
  root: string;
  pkgs: string[];
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
        ...opts.pkgs,
        opts.type === "dependencies" ? "--save" : "--save-dev",
      ],
      {
        cwd: opts.root,
        stdio: "inherit",
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
        (opts.type === "devDependencies" && "--dev") || "",
        "-W",
        ...opts.pkgs,
      ].filter((item) => item),
      {
        cwd: opts.root,
        stdio: "inherit",
      }
    );
  },
};
