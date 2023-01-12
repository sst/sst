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
      const { createSpinner } = await import("../spinner.js");
      const { Stacks } = await import("../../stacks/index.js");
      const spinner = createSpinner("Building stacks").start();
      await Stacks.synth({
        fn: useProject().stacks,
        buildDir: args.to,
        mode: "deploy",
      });
      spinner.succeed();
      process.exit(0);
    }
  );
