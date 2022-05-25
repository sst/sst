import path from "path";
import fs from "fs";
import dotenv from "dotenv";
import dotenvExpand from "dotenv-expand";
import { Paths } from "./index.js";

type LoadOpts = {
  searchPaths?: string[];
  root?: string;
};

export async function load(opts?: LoadOpts) {
  const paths = [...(opts?.searchPaths || []), ".env.local", ".env"];
  paths
    .map((file) => path.join(opts?.root || Paths.APP_PATH, file))
    .filter((path) => fs.existsSync(path))
    .map((path) => {
      const result = dotenv.config({
        path,
        debug: process.env.DEBUG !== undefined ? true : undefined,
      });
      if (result.error) {
        // This should throw a normal exception and not assume the process should be killed
        console.error(`Failed to load environment variables from "${path}".`);
        console.error(result.error.message);
        process.exit(1);
      }
      return dotenvExpand(result);
    });
}
