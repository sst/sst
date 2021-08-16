import fs from "fs";
import path from "path";
import spawn from "cross-spawn";

export function run(rootDir: string) {
  const manager = fs.existsSync(path.join(rootDir, "yarn.lock")) ? Yarn : NPM;
  const json = JSON.parse(
    fs.readFileSync(path.join(rootDir, "package.json")).toString()
  );

  manager.update({
    root: rootDir,
    type: json.dependencies["@serverless-stack/cli"]
      ? "dependencies"
      : "devDependencies",
    pkgs: ["@serverless-stack/cli@latest"],
  });
  manager.update({
    root: rootDir,
    type: json.dependencies["@serverless-stack/resources"]
      ? "dependencies"
      : "devDependencies",
    pkgs: ["@serverless-stack/resources@latest"],
  });

  const compare = JSON.parse(
    fs
      .readFileSync(
        path.join(
          rootDir,
          "node_modules/@serverless-stack/resources/package.json"
        )
      )
      .toString()
  );

  function cdk(type: "dependencies" | "devDependencies") {
    const updates = Object.keys(json[type] || {})
      .filter((key) => key.startsWith("@aws-cdk"))
      .filter((key) => json.dependencies[key] || json.devDependencies[key])
      .filter((key) => compare.dependencies[key])
      .map((key) => `${key}@${compare.dependencies[key]}`);
    if (!updates.length) return;
    manager.update({
      type,
      root: rootDir,
      pkgs: updates,
    });
  }

  cdk("dependencies");
  cdk("devDependencies");
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
      ["add", opts.type === "dependencies" ? "" : "--dev", "-W", ...opts.pkgs],
      {
        cwd: opts.root,
        stdio: "inherit",
      }
    );
  },
};
