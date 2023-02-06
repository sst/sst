import type { Program } from "../program.js";

export const bootstrap = (program: Program) =>
  program.command(
    "bootstrap",
    "Create the SST bootstrap stack",
    (yargs) => yargs,
    async () => {
      const { useBootstrap } = await import("../../bootstrap.js");
      await useBootstrap();
    }
  );
