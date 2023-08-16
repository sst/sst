import path from "path";
import type { Program } from "../program.js";

export const types = (program: Program) =>
  program.command(
    "types",
    "Generate resource types in .sst/types",
    (yargs) => yargs,
    async () => {
      const { useProject } = await import("../../project.js");
      const { Stacks } = await import("../../stacks/index.js");
      const { App } = await import("../../constructs/App.js");
      const { Colors } = await import("../colors.js");
      const project = useProject();
      const [_metafile, sstConfig] = await Stacks.load(project.paths.config);
      const app = new App({
        mode: "deploy",
        stage: project.config.stage,
        name: project.config.name,
        region: project.config.region,
      });
      sstConfig.stacks(app);
      app.codegenTypes();
      Colors.line(
        Colors.success(`✔ `),
        `Types generated in ${path.resolve(project.paths.out, "types")}`
      );
      process.exit(0);
    }
  );
