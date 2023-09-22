import type { Program } from "../program.js";

export const bootstrap = (program: Program) =>
  program.command(
    "bootstrap",
    "Create the SST bootstrap stack",
    (yargs) => yargs,
    async () => {
      const { exit, exitWithError } = await import("../program.js");
      const { useBootstrap } = await import("../../bootstrap.js");

      try {
        await useBootstrap();
        await exit();
      } catch (e: any) {
        await exitWithError(e);
      }
    }
  );
