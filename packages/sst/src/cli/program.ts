import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import { initProject } from "../app.js";
import { trackCli } from "./telemetry/telemetry.js";

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
    trackCli(argv._[0] as string);
  })
  .strict()
  .demandCommand(1);

export type Program = typeof program;
