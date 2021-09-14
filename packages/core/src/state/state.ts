import fs from "fs";
import path from "path";
import os from "os";
import { STS } from "aws-sdk";

export function resolve(root: string, relative: string) {
  return path.resolve(root, ".sst", relative);
}

export function init(root: string) {
  const dir = directory(root);
  if (fs.existsSync(dir)) return;
  fs.mkdirSync(dir, { recursive: true });
}

export function directory(root: string) {
  return resolve(root, "");
}

function resolveStage(root: string) {
  return resolve(root, "stage");
}

export function getStage(root: string) {
  const file = resolveStage(root);
  try {
    return fs.readFileSync(file).toString();
  } catch {
    return null;
  }
}

export function setStage(root: string, stage: string) {
  const file = resolveStage(root);
  fs.writeFileSync(file, stage);
}

export async function suggestStage() {
  const client = new STS();
  const result = await client
    .getCallerIdentity()
    .promise()
    .then((result) => path.basename(result.Arn!))
    .catch(() => os.userInfo().username);
  return result.replaceAll(/[^A-Za-z0-9]/g, "-");
}
