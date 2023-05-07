import { VisibleError } from "../error.js";
import fs from "fs/promises";
import path from "path";

export async function findAbove(
  dir: string,
  target: string
): Promise<string | undefined> {
  if (dir === "/") return undefined;
  if (await existsAsync(path.join(dir, target))) return dir;
  return findAbove(path.resolve(path.join(dir, "..")), target);
}

export async function findBelow(dir: string, target: string) {
  async function loop(dir: string): Promise<string | undefined> {
    const current = path.join(dir, target);
    if (await existsAsync(current)) return dir;

    const files = await fs.readdir(dir);
    for (const file of files) {
      if (file === "node_modules") continue;
      if (file === ".sst") continue;
      const full = path.join(dir, file);
      const stat = await fs.stat(full);
      if (stat.isDirectory()) {
        const result = await loop(full);
        if (result) return result;
      }
    }
    return;
  }

  const value = await loop(dir);
  if (!value) throw new VisibleError(`Could not find a ${target} file`);
  return value;
}

export function isChild(parent: string, child: string) {
  const relative = path.relative(parent, child);
  return Boolean(
    relative && !relative.startsWith("..") && !path.isAbsolute(relative)
  );
}

export async function existsAsync(path: string) {
  return fs
    .access(path)
    .then(() => true)
    .catch(() => false);
}
