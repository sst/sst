import path from "path";
import fs from "fs";
import dotenv from "dotenv";
import dotenvExpand from "dotenv-expand";
import { Paths } from "./";

type LoadOpts = {
  searchPaths?: string[];
};

export async function load(opts?: LoadOpts) {
  const paths = [...(opts?.searchPaths || []), ".env.local", ".env"];
  paths
    .map((file) => path.join(Paths.APP_PATH, file))
    .filter((path) => fs.existsSync(path))
    .map((path) => {
      const result = dotenv.config({
        path,
        debug: process.env.DEBUG !== undefined,
      });
      if (result.error) {
        console.error(`Failed to load environment variables from "${path}".`);
        console.error(result.error.message);
        process.exit(1);
      }
      return dotenvExpand(result);
    });
}
