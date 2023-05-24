import fs from "fs/promises";
import fetch from "node-fetch";
import path from "path";
import { execSync } from "child_process";
import { applyOperation } from "fast-json-patch/index.mjs";
import { pathToFileURL } from "url";
import { loadFile, writeFile } from "magicast";

export function extract() {
  return /** @type {const} */ ({
    type: "extract",
  });
}

/**
 * @param {{
 *   file: string,
 *   fn: (mod) => void,
 * }} opts
 */
export function magicast(opts) {
  return /** @type {const} */ ({
    type: "magicast",
    ...opts,
  });
}

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
 *   file: string,
 *   pattern: string,
 *   replacement: string,
 * }} opts
 */
export function str_replace(opts) {
  return /** @type {const} */ ({
    type: "str_replace",
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
 * @param {{
 * cmd: string
 * cwd?: string
 * }} opts
 */
export function cmd(opts) {
  return /** @type {const} */ ({
    type: "cmd",
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
 * @typedef {ReturnType<typeof remove> | ReturnType<typeof patch> | ReturnType<typeof str_replace> | ReturnType<typeof install> | ReturnType<typeof extract> | ReturnType<typeof extend> | ReturnType<typeof cmd> | ReturnType<typeof magicast>} Step
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
  const result = await import(
    pathToFileURL(path.join(source, "preset.mjs")).href
  );
  /** @type {Step[]} */
  const steps = result.default;

  for (const step of steps) {
    switch (step.type) {
      case "magicast": {
        const file = path.join(opts.destination, step.file);
        const mod = await loadFile(file);
        step.fn(mod);
        await writeFile(mod);
      }
      case "extract": {
        const templates = path.join(source, "templates");
        const files = await listFiles(templates);
        for (const file of files) {
          const relative = path.relative(
            templates,
            file.replace("gitignore", ".gitignore")
          );
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
      case "str_replace": {
        const file = path.join(opts.destination, step.file);
        const contents = await fs.readFile(file, "utf8");
        await fs.writeFile(
          file,
          contents.replace(step.pattern, step.replacement)
        );
        break;
      }
      case "cmd": {
        execSync(step.cmd, {
          cwd: path.join(opts.destination, step.cwd || ""),
        });
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
        const results = await Promise.all(
          step.packages.map(async (pkg) => {
            let [, version] = pkg.substring(1).split("@");
            if (!version) version = "^" + (await getLatestPackageVersion(pkg));
            return [pkg.replace("@" + version, ""), version];
          })
        );
        for (const [name, value] of results) {
          json[key][name] = value;
        }
        await fs.writeFile(jsonPath, JSON.stringify(json, null, 2));
        break;
      }
    }
  }

  if (!opts.extended) {
    // App name will be used in CloudFormation stack names,
    // so we need to make sure it's valid.
    const app = path
      .basename(opts.destination)
      // replace _ with -
      .replace(/_/g, "-")
      // remove non-alpha numeric dash characters
      .replace(/[^A-Za-z0-9-]/g, "");
    const appAlpha = app.replace(/[^a-zA-Z0-9]/g, "");

    for (const file of await listFiles(opts.destination)) {
      if (file.includes(".git")) continue;
      if (
        ![".ts", ".js", ".tsx", ".jsx", ".json"].some((ext) =>
          file.endsWith(ext)
        )
      )
        continue;
      try {
        const contents = await fs.readFile(file, "utf8");
        if (file.endsWith(".png") || file.endsWith(".ico")) continue;
        await fs.writeFile(
          file,
          contents
            .replace(/\@\@app/g, app)
            .replace(/\@\@normalizedapp/g, appAlpha)
        );
      } catch {
        continue;
      }
    }
  }
}

/**
 * @param {string} dir
 */
async function listFiles(dir) {
  if (dir.endsWith("node_modules")) return [];
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
async function getLatestPackageVersion(pkg) {
  return fetch(`https://registry.npmjs.org/${pkg}/latest`)
    .then((res) => res.json())
    .then((res) => res.version);
}
