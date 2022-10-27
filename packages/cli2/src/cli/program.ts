import yargs from "yargs";
/* @ts-expect-error */
import { hideBin } from "yargs/helpers";
import { initProject } from "@core/app.js";

export const program = yargs(hideBin(process.argv))
  .scriptName("sst")
  .option("stage", {
    type: "string",
    describe: "The stage to use, defaults to personal stage",
  })
  .option("profile", {
    type: "string",
    describe: "The AWS profile to use",
  })
  .middleware(async (argv) => {
    await initProject(argv);
  })
  .strict()
  .demandCommand(1);

export type Program = typeof program;
