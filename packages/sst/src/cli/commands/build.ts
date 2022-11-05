import { Stacks } from "../../stacks/index.js";
import { Program } from "../program.js";

export const build = (program: Program) =>
  program.command(
    "build",
    "Build stacks code",
    (yargs) => yargs.option("from", { type: "string" }),
    async () => {
      const fn = await Stacks.build();
      await Stacks.synth({
        fn,
        mode: "deploy",
      });
    }
  );
