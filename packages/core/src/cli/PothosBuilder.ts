import { Bus } from "./Bus.js";
import fs from "fs/promises";
import path from "path";
import { exec } from "child_process";
import { Pothos } from "../pothos/index.js";
import { promisify } from "util";

declare module "./Bus" {
  export interface Events {
    "pothos.extracted": {
      file: string;
    };
  }
}

const execAsync = promisify(exec);

interface Opts {
  bus: Bus;
}
export function createPothosBuilder(opts: Opts) {
  // TODO: Once this file lives in CLI it can depend on the resources package to get the type
  let routes: any[] = [];

  async function build(route: any) {
    try {
      const schema = await Pothos.generate({
        schema: route.schema
      });
      await fs.writeFile(route.output, schema);
      opts.bus.publish("pothos.extracted", { file: route.output });
      await Promise.all(route.commands.map((cmd: string) => execAsync(cmd)));
      console.log("Done building pothos schema");
    } catch (ex) {
      console.error("Failed to extract schema from pothos");
      console.error(ex);
    }
  }

  opts.bus.subscribe("file.changed", async evt => {
    if (evt.properties.file.endsWith("out.mjs")) return;
    for (const route of routes) {
      const dir = path.dirname(route.schema);
      const relative = path.relative(dir, evt.properties.file);
      if (relative && !relative.startsWith("..") && !path.isAbsolute(relative))
        build(route);
    }
  });

  opts.bus.subscribe("stacks.deployed", evt => {
    routes = evt.properties.metadata
      .filter(c => c.type == "Api")
      .flatMap(c => c.data.routes)
      .filter(r => r.type === "pothos")
      .filter(r => r.schema);
    for (const route of routes) build(route);
  });
}
