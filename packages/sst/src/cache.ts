import path from "path";
import fs from "fs/promises";
import { useProject } from "./project.js";
import { Logger } from "./logger.js";
import { Context } from "./context/context.js";
import { lazy } from "./util/lazy.js";

export const useCache = lazy(async () => {
  const project = useProject();
  const cache = path.join(project.paths.out, "cache");
  await fs.mkdir(cache, {
    recursive: true,
  });

  async function write(key: string, data: string) {
    const full = path.join(cache, key);
    Logger.debug("Writing cache", full, data.length, "bytes");
    await fs.writeFile(full, data);
  }

  async function read(key: string) {
    const full = path.join(cache, key);
    try {
      const data = await fs.readFile(full);
      return data.toString();
    } catch {
      return null;
    }
  }

  return {
    write,
    read,
  };
});
