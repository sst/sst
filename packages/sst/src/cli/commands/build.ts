import type { Program } from "../program.js";

export const build = (program: Program) =>
  program.command(
    "build",
    "Build your app",
    (yargs) =>
      yargs.option("to", {
        type: "string",
        describe: "Output directory, defaults to .sst/dist",
      }),
    async (args) => {
      const { useProject } = await import("../../project.js");
      const { Stacks } = await import("../../stacks/index.js");
      const { Colors } = await import("../colors.js");
      const path = await import("path");
      const project = useProject();
      const [_metafile, sstConfig] = await Stacks.load(project.paths.config);
      const result = await Stacks.synth({
        fn: sstConfig.stacks,
        buildDir: args.to,
        mode: "deploy",
      });
      Colors.line("");
      Colors.line(
        Colors.success(`✔`),
        Colors.bold(" Built:"),
        `${result.stacks.length} stack${
          result.stacks.length > 1 ? "s" : ""
        } to ${path.relative(process.cwd(), result.directory)}`
      );
      process.exit(0);
    }
  );
