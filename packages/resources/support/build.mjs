import fs from "fs/promises";
import path from "path";

const dirs = await fs
  .readdir("./support")
  .then((files) => files.filter((x) => !x.endsWith(".mjs")));

await Promise.all(
  dirs.map((dir) => {
    const script = path.join(dir, "build.mjs");
    console.log("Building", script);
    return import("./" + script);
  })
);
