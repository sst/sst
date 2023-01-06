export * as SiteEnv from "./site-env.js";
import fs from "fs";
import path from "path";
import { useProject } from "./project.js";

function keysFile() {
  return path.join(useProject().paths.out, "site-environment-keys.jsonl");
}

export function valuesFile() {
  return path.join(useProject().paths.out, "site-environment-values.json");
}

interface Key {
  path: string;
  output: string;
  environment: string;
  stack: string;
}

export async function keys() {
  try {
    const file = keysFile();
    const data = await fs.promises
      .readFile(file)
      .then((x) => x.toString().split("\n"));
    return data.filter(Boolean).map((x) => JSON.parse(x) as Key);
  } catch {
    return [];
  }
}

export async function values() {
  try {
    const file = valuesFile();
    const data = await fs.promises
      .readFile(file)
      .then((x) => JSON.parse(x.toString()));
    return data as Record<string, Record<string, string>>;
  } catch {
    return {};
  }
}

export async function writeValues(
  input: Record<string, Record<string, string>>
) {
  const file = valuesFile();
  await fs.promises.writeFile(file, JSON.stringify(input));
}

export function append(input: Key) {
  fs.appendFileSync(keysFile(), JSON.stringify(input) + "\n");
}

export function reset() {
  fs.rmSync(keysFile(), {
    force: true,
    recursive: true,
  });
}
