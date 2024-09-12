import path from "path";
import fs from "fs/promises";
import { exec } from "child_process";
import pulumi from "@pulumi/pulumi";
import fsSync from "fs";
import { Semaphore } from "../util/semaphore.js";
import { FunctionArgs } from "../components/aws/function.js";
import { findAbove } from "../util/fs.js";
import os from "os";

const limiter = new Semaphore(
  parseInt(process.env.SST_BUILD_CONCURRENCY || "4"),
);

export async function buildPythonContainer(
  name: string,
  input: pulumi.Unwrap<FunctionArgs> & {
    links?: {
      name: string;
      properties: any;
    }[];
  },
): Promise<
  | {
      type: "success";
      out: string;
      handler: string;
    }
  | { type: "error"; errors: string[] }
> {
  const out = path.join($cli.paths.work, "artifacts", `${name}-src`);
  await fs.rm(out, { recursive: true, force: true });
  await fs.mkdir(out, { recursive: true });

  const parsed = path.parse(input.handler);
  const file = path.join(parsed.dir, parsed.name + ".py");
  if (!fsSync.existsSync(file)) {
    return {
      type: "error",
      errors: [`Could not find file for handler "${input.handler}"`],
    };
  }

  // Calculate the relative path from the project root to the handler's directory
  const relativePath = path.relative($cli.paths.root, parsed.dir);

  // Target directory should preserve the relative path
  const targetDir = path.join(out, relativePath);
  await fs.mkdir(targetDir, { recursive: true });

  // Full path to where the handler file will be copied, with the extension changed to .py
  const targetFileName = parsed.name + ".py";
  const target = path.join(targetDir, targetFileName);

  try {
    await limiter.acquire(name);

    // Copy the handler file to the output directory
    await fs.copyFile(file, target);

    // Find the closest pyproject.toml
    const pyProjectFile = await findAbove(parsed.dir, "pyproject.toml");
    if (!pyProjectFile) {
      return {
        type: "error",
        errors: [
          `Could not find pyproject.toml for handler "${input.handler}"`,
        ],
      };
    }

    // Copy pyproject.toml to the output directory
    await fs.copyFile(
      path.join(pyProjectFile, "pyproject.toml"),
      path.join(out, path.join(pyProjectFile, "pyproject.toml")),
    );

    // Check for uv.lock and copy it if it exists
    const uvLockFile = path.join(pyProjectFile, "uv.lock");
    if (fsSync.existsSync(uvLockFile)) {
      await fs.copyFile(uvLockFile, path.join(out, "uv.lock"));
    }

    // Check for dockerfile and copy it if it exists
    const dockerFile = path.join(pyProjectFile, "Dockerfile");
    if (fsSync.existsSync(dockerFile)) {
      await fs.copyFile(dockerFile, path.join(out, "Dockerfile"));
    } else {
      await fs.copyFile(
        path.join(
          $cli.paths.platform,
          "functions",
          "docker",
          "python.Dockerfile",
        ),
        path.join(out, "Dockerfile"),
      );
    }

    return {
      type: "success",
      out,
      handler: path
        .join(relativePath, parsed.base)
        .split(path.sep)
        .join(path.posix.sep),
    };
  } catch (ex: any) {
    return {
      type: "error",
      errors: [ex.toString()],
    };
  } finally {
    limiter.release();
  }
}

export async function buildPython(
  name: string,
  input: pulumi.Unwrap<FunctionArgs> & {
    links?: {
      name: string;
      properties: any;
    }[];
  },
): Promise<
  | {
      type: "success";
      out: string;
      handler: string;
    }
  | { type: "error"; errors: string[] }
> {
  const out = path.join($cli.paths.work, "artifacts", `${name}-src`);
  await fs.rm(out, { recursive: true, force: true });
  await fs.mkdir(out, { recursive: true });

  const parsed = path.parse(input.handler);
  const file = path.join(parsed.dir, parsed.name + ".py");
  if (!fsSync.existsSync(file)) {
    return {
      type: "error",
      errors: [`Could not find file for handler "${input.handler}"`],
    };
  }

  // Calculate the relative path from the project root to the handler's directory
  const relativePath = path.relative($cli.paths.root, parsed.dir);

  // Target directory should preserve the relative path
  const targetDir = path.join(out, relativePath);
  await fs.mkdir(targetDir, { recursive: true });

  // Full path to where the handler file will be copied, with the extension changed to .py
  const targetFileName = parsed.name + ".py";
  const target = path.join(targetDir, targetFileName);

  try {
    await limiter.acquire(name);

    // Copy the handler file to the output directory
    await fs.copyFile(file, target);

    // Find the closest pyproject.toml
    const pyProjectFile = await findAbove(parsed.dir, "pyproject.toml");
    if (!pyProjectFile) {
      return {
        type: "error",
        errors: [
          `Could not find pyproject.toml or requirements.txt for handler "${input.handler}"`,
        ],
      };
    }

    // Copy pyproject.toml to the output directory
    await fs.copyFile(
      path.join(pyProjectFile, "pyproject.toml"),
      path.join(out, path.join(pyProjectFile, "pyproject.toml")),
    );

    // Install Python dependencies
    // in the output directory we run uv sync to create a virtual environment
    // first make the output directory the working directory
    // also need to use sst uv path because it is not guaranteed to be in the path
    const installCmd = `cd ${path.join(out, pyProjectFile)} && uv sync`;

    // Once the packages are synced, we need to convert the virtual environment to site-packages so that lambda can find the packages
    const sitePackagesCmd = `cp -r ${path.join(
      out,
      pyProjectFile,
      ".venv",
      "lib",
      "python3.*",
      "site-packages",
      "*",
    )} ${out}`;

    // Now remove the virtual environment because it does not need to be included in the zip
    const removeVirtualEnvCmd = `rm -rf ${path.join(
      out,
      pyProjectFile,
      ".venv",
    )}`;

    const command = `${installCmd} && ${sitePackagesCmd} && ${removeVirtualEnvCmd}`;

    await new Promise<void>((resolve, reject) => {
      exec(command, { cwd: out }, (error) => {
        if (error) {
          return reject(error);
        }
        resolve();
      });
    });

    return {
      type: "success",
      out,
      handler: path
        .join(relativePath, parsed.base)
        .split(path.sep)
        .join(path.posix.sep),
    };
  } catch (ex: any) {
    return {
      type: "error",
      errors: [ex.toString()],
    };
  } finally {
    limiter.release();
  }
}
