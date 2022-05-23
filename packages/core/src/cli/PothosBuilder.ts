import { Bus } from "./Bus.js";
import fs from "fs/promises";
import path from "path";
import { exec } from "child_process";
import { Pothos } from "../pothos/index.js";
import { promisify } from "util";

const execAsync = promisify(exec);

interface Opts {
  bus: Bus;
}
export function createPothosBuilder(opts: Opts) {
  // TODO: Once this file lives in CLI it can depend on the resources package to get the type
  let routes: any[] = [];

  async function build(route: any) {
    const schema = await Pothos.generate({
      schema: route.schema,
    });
    await fs.writeFile(route.output, schema);
    await Promise.all(route.commands.map((cmd: string) => execAsync(cmd)));
  }

  opts.bus.subscribe("file.changed", async (evt) => {
    for (const route of routes) {
      const dir = path.dirname(route.schema);
      const relative = path.relative(dir, evt.properties.file);
      if (relative && !relative.startsWith("..") && !path.isAbsolute(relative))
        build(route);
    }
  });

  opts.bus.subscribe("metadata.updated", (evt) => {
    routes = evt.properties
      .filter((c) => c.type == "Api")
      .flatMap((c) => c.data.routes)
      .filter((r) => r.type === "pothos");
    for (const route of routes) build(route);
  });
}
