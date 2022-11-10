import { Program } from "../program.js";
import { createSpinner } from "../spinner.js";

export const build = (program: Program) =>
  program.command(
    "build",
    "Build stacks code",
    yargs => yargs.option("from", { type: "string" }),
    async () => {
      const { Stacks } = await import("../../stacks/index.js");
      const spinner = createSpinner("Building stacks").start();
      const fn = await Stacks.build();
      await Stacks.synth({
        fn,
        mode: "deploy"
      });
      spinner.succeed();
      process.exit(0);
    }
  );
