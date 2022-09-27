import { Context } from "@serverless-stack/node/context/index.js";
import path from "path";
import fs from "fs/promises";
import { useProjectRoot } from "../config/index.js";

export const useStateDirectory = Context.memo(async () => {
  const root = path.join(await useProjectRoot(), ".sst");
  await fs.mkdir(root, {
    recursive: true
  });

  return root;
});

export const usePersonalStage = Context.memo(async () => {
  const state = await useStateDirectory();
  try {
    const result = await fs.readFile(path.join(state, "stage"));
    return result.toString("utf8").trim();
  } catch {
    return;
  }
});
