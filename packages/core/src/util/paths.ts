import fs from "fs";
import path from "path";

// Make sure any symlinks in the project folder are resolved:
// https://github.com/facebook/create-react-app/issues/637
const appDirectory = fs.realpathSync(process.cwd());

function resolveApp(relativePath: string) {
  return path.resolve(appDirectory, relativePath);
}

export const APP_PATH = resolveApp(".");
export const OWN_PATH = path.resolve(__dirname, "..", ".");
