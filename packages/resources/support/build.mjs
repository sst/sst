import fs from "fs/promises";
import path from "path";

const dirs = await fs
  .readdir("./support")
  .then((files) => files.filter((x) => !x.endsWith(".mjs")));

await Promise.all(
  dirs.map(async (dir) => {
    const stat = await fs.stat(path.join("support", dir));
    if (!stat.isDirectory()) return;
    const script = path.join(dir, "build.mjs");
    console.log("Building", script);
    return import("./" + script);
  })
);
