import path from "path";
import type { Program } from "../program.js";

export const types = (program: Program) =>
  program.command(
    "types",
    "Generate resource types in .sst/types",
    (yargs) => yargs,
    async () => {
      const { exit, exitWithError } = await import("../program.js");
      const { useProject } = await import("../../project.js");
      const { Stacks } = await import("../../stacks/index.js");
      const { App } = await import("../../constructs/App.js");
      const { Colors } = await import("../colors.js");

      try {
        const project = useProject();
        const [_metafile, sstConfig] = await Stacks.load(project.paths.config);
        await Stacks.synth({
          fn: sstConfig.stacks,
          mode: "remove",
        });
        Colors.line(
          Colors.success(`✔ `),
          `Types generated in ${path.resolve(project.paths.out, "types")}`
        );

        await exit();
      } catch (e: any) {
        await exitWithError(e);
      }
    }
  );
