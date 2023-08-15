import type { Program } from "../program.js";

export const genTypes = (program: Program) =>
  program.command(
    "genTypes",
    "Generate resource types in .sst/types",
    (yargs) => yargs,
    async () => {
      const { useProject } = await import("../../project.js");
      const { Stacks } = await import("../../stacks/index.js");
      const { App } = await import("../../constructs/App.js");
      const { Colors } = await import("../colors.js");
      const path = await import("path");
      const project = useProject();
      const [_, sstConfig] = await Stacks.load(project.paths.config);
      const app = new App({
        mode: "deploy",
        stage: project.config.stage,
        name: project.config.name,
        region: project.config.region,
      });
      sstConfig.stacks(app);
      app.codegenTypes();
      Colors.line("");
      Colors.line(
        Colors.success(`✔`),
        Colors.bold(" Types generated:"),
        `${path.resolve(project.paths.out, "types")}`
      );
      process.exit(0);
    }
  );
