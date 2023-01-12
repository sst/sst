import { useProject } from "../../project.js";
import { Program } from "../program.js";
import { createSpinner } from "../spinner.js";

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
