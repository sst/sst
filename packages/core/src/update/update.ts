import fs from "fs";
import path from "path";
import spawn from "cross-spawn";

export function run(rootDir: string) {
  const manager = fs.existsSync(path.join(rootDir, "yarn.lock")) ? Yarn : NPM;
  const json = JSON.parse(
    fs.readFileSync(path.join(rootDir, "package.json")).toString()
  );

  manager.update(
    json.dependencies["@serverless-stack/cli"]
      ? "dependencies"
      : "devDependencies",
    "@serverless-stack/cli@latest"
  );
  manager.update(
    json.dependencies["@serverless-stack/resources"]
      ? "dependencies"
      : "devDependencies",
    "@serverless-stack/resources@latest"
  );

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
    manager.update(type, ...updates);
  }

  cdk("dependencies");
  cdk("devDependencies");
}

type PackageManager = {
  update: (type: "dependencies" | "devDependencies", ...pkgs: string[]) => void;
};

const NPM: PackageManager = {
  update(type, ...pkgs) {
    return spawn.sync(
      "npm",
      ["install", ...pkgs, type === "dependencies" ? "--save" : "--save-dev"],
      {
        stdio: "inherit",
      }
    );
  },
};

const Yarn: PackageManager = {
  update(type, ...pkgs) {
    return spawn.sync(
      "yarn",
      ["add", type === "dependencies" ? "" : "--dev", "-W", ...pkgs],
      {
        stdio: "inherit",
      }
    );
  },
};
