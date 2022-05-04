import fs from "fs/promises";
import path from "path";
import { exec } from "child_process";
import { applyOperation } from "fast-json-patch/index.mjs";

export function extract() {
  return /** @type {const} */ ({
    type: "extract",
  });
}

/**
 * @typedef {{
 *   type: "edit-json",
 *   merge: any
 * }} EditJsonOperation
 */

/**
 * @param {string} path
 */
export function remove(path) {
  return /** @type {const} */ ({
    type: "remove",
    path,
  });
}

/**
 * @param {{
 *   file: string,
 *   operations: import("fast-json-patch").Operation[],
 * }} opts
 */
export function patch(opts) {
  return /** @type {const} */ ({
    type: "patch",
    ...opts,
  });
}

/**
 * @param {{
 *  packages: string[],
 *  path?: string,
 *  dev?: boolean
 * }} opts
 */
export function install(opts) {
  return /** @type {const} */ ({
    type: "install",
    ...opts,
  });
}

/**
 * @param {string} path
 */
export function extend(path) {
  return /** @type {const} */ ({
    type: "extend",
    path: path,
  });
}

/**
 * @typedef {ReturnType<typeof remove> | ReturnType<typeof patch> | ReturnType<typeof install> | ReturnType<typeof extract> | ReturnType<typeof extend>} Step
 */

/**
 * @param {{
 *   source: string
 *   destination: string
 *   extended?: boolean
 * }} opts
 */
export async function execute(opts) {
  const source = path.resolve(opts.source);
  const result = await import(path.join(source, "preset.mjs"));
  /** @type {Step[]} */
  const steps = result.default;

  for (const step of steps) {
    switch (step.type) {
      case "extract": {
        const templates = path.join(source, "templates");
        const files = await listFiles(templates);
        for (const file of files) {
          const relative = path.relative(templates, file);
          const destination = path.join(opts.destination, relative);
          await fs.mkdir(path.dirname(destination), { recursive: true });
          await fs.copyFile(file, destination);
        }
        break;
      }
      case "extend": {
        await execute({
          source: step.path,
          destination: opts.destination,
          extended: true,
        });
        break;
      }
      case "remove": {
        await fs.rm(path.join(opts.destination, step.path), {
          recursive: true,
          force: true,
        });
        break;
      }
      case "patch": {
        const file = path.join(opts.destination, step.file);
        const contents = JSON.parse(await fs.readFile(file, "utf8"));
        for (const operation of step.operations) {
          applyOperation(contents, operation);
        }
        await fs.writeFile(file, JSON.stringify(contents, null, 2));
        break;
      }
      case "install": {
        const jsonPath = path.join(
          opts.destination,
          step.path || ".",
          "package.json"
        );
        const json = JSON.parse(await fs.readFile(jsonPath, "utf8"));
        const key = step.dev ? "devDependencies" : "dependencies";
        json[key] = json[key] || {};
        for (const pkg of step.packages) {
          let [, version] = pkg.substring(1).split("@");
          if (!version) version = await getLatestPackageVersion(pkg);
          json[key][pkg.replace("@" + version, "")] = "^" + version;
        }
        await fs.writeFile(jsonPath, JSON.stringify(json, null, 2));
        break;
      }
    }
  }

  if (!opts.extended) {
    const app = path.basename(opts.destination);

    for (const file of await listFiles(opts.destination)) {
      const contents = await fs.readFile(file, "utf8");
      await fs.writeFile(file, contents.replace(/\@\@app/g, app));
    }
  }
}

/**
 * @param {string} dir
 */
async function listFiles(dir) {
  const results = [];
  for (const file of await fs.readdir(dir)) {
    const p = path.join(dir, file);
    const stat = await fs.stat(p);
    if (stat.isDirectory()) {
      results.push(...(await listFiles(p)));
      continue;
    }
    results.push(p);
  }
  return results;
}

/**
 * @param {string} pkg
 */
function getLatestPackageVersion(pkg) {
  return new Promise((resolve) => {
    let data = "";
    const proc = exec(`npm show ${pkg} dist-tags.latest`, {
      stdio: "pipe",
    });
    proc.stdout.on("data", (chunk) => (data += chunk));
    proc.on("exit", () => {
      resolve(data.trim());
    });
  });
}
