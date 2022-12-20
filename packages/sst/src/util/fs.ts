import { VisibleError } from "../error.js";
import fs from "fs/promises";
import path from "path";

export async function findFile(dir: string, target: string): Promise<string> {
  if (dir === "/") throw new VisibleError(`Could not find a ${target} file`);
  if (
    await fs
      .access(path.join(dir, target))
      .then(() => true)
      .catch(() => false)
  )
    return dir;
  return findFile(path.join(dir, ".."), target);
}

export function isChild(parent: string, child: string) {
  const relative = path.relative(parent, child);
  return Boolean(
    relative && !relative.startsWith("..") && !path.isAbsolute(relative)
  );
}
