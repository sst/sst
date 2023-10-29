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
        // Note: do not run synth which requires AWS credentials. B/c generating
        //       types is usually done inside CI pipelines. And credentials
        //       might not be available. ie.
        //  await Stacks.synth({
        //    fn: sstConfig.stacks,
        //    mode: "remove",
        //  });
        const app = new App({
          mode: "remove",
          stage: project.config.stage,
          name: project.config.name,
          region: project.config.region,
        });
        sstConfig.stacks(app);
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
