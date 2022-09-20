import { Context } from "@serverless-stack/node/context/index.js";
import path from "path";
import fs from "fs/promises";
import { ProjectRoot } from "../config/index.js";

export const useState = Context.memo(async () => {
  const root = path.join(await ProjectRoot.use(), ".sst");
  await fs.mkdir(root, {
    recursive: true
  });

  return root;
});

export const PersonalStageContext = Context.create(async () => {
  const state = await useState();
  try {
    const result = await fs.readFile(path.join(state, "stage"));
    return result.toString("utf8");
  } catch {
    return;
  }
});
