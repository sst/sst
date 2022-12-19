import { useBus } from "../../../bus.js";
import { ApiMetadata } from "../../../constructs/Metadata.js";
import { Context } from "../../../context/context.js";
import { Pothos } from "../../../pothos.js";
import fs from "fs/promises";
import { exec } from "child_process";
import { promisify } from "util";
const execAsync = promisify(exec);
import path from "path";

export const usePothosBuilder = Context.memo(() => {
  let routes: Extract<
    ApiMetadata["data"]["routes"][number],
    { type: "graphql" | "pothos" }
  >[] = [];
  const bus = useBus();

  async function build(route: any) {
    try {
      const schema = await Pothos.generate({
        schema: route.schema,
      });
      await fs.writeFile(route.output, schema);
      // bus.publish("pothos.extracted", { file: route.output });
      await Promise.all(route.commands.map((cmd: string) => execAsync(cmd)));
      console.log("Done building pothos schema");
    } catch (ex) {
      console.error("Failed to extract schema from pothos");
      console.error(ex);
    }
  }

  bus.subscribe("file.changed", async (evt) => {
    if (evt.properties.file.endsWith("out.mjs")) return;
    for (const route of routes) {
      const dir = path.dirname(route.schema!);
      const relative = path.relative(dir, evt.properties.file);
      if (relative && !relative.startsWith("..") && !path.isAbsolute(relative))
        build(route);
    }
  });

  let first = false;
  bus.subscribe("stacks.metadata", async (evt) => {
    routes = Object.values(evt.properties)
      .flat()
      .filter((c): c is ApiMetadata => c.type == "Api")
      .flatMap((c) => c.data.routes)
      .filter((r) => ["pothos", "graphql"].includes(r.type))
      .filter((r) => r.schema) as typeof routes;
    if (first) return;
    for (const route of routes) {
      build(route);
      first = true;
    }
  });
});
