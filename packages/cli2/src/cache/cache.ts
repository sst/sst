import { useStateDirectory } from "../state";
import path from "path";
import fs from "fs/promises";
import { Context } from "@serverless-stack/node/context/index.js";
import { Logger } from "../logger";

export const useCache = Context.memo(() => {
  async function write(key: string, data: string) {
    const root = await useStateDirectory();
    const full = path.join(root, "cache", key);
    Logger.debug("Writing cache", full, data.length, "bytes");
    await fs.writeFile(full, data);
  }

  async function read(key: string) {
    const root = await useStateDirectory();
    const full = path.join(root, "cache", key);
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
