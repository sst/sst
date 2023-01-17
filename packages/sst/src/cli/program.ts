import yargs from "yargs";
import { hideBin } from "yargs/helpers";

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
  .option("region", {
    type: "string",
    describe: "The AWS region to use",
  })
  .option("verbose", {
    type: "boolean",
    describe: "Print verbose logs",
  })
  .group(["stage", "profile", "region", "help"], "Global:")
  .middleware(async (argv) => {
    if (argv.verbose) {
      process.env.SST_VERBOSE = "1";
    }
    if (argv._.length > 0) {
      const { initProject } = await import("../project.js");
      await initProject(argv);
      const { trackCli } = await import("./telemetry/telemetry.js");
      trackCli(argv._[0] as string);
    }
  })
  .version(false)
  .epilogue(`Join the SST community on Discord https://sst.dev/discord`)
  .recommendCommands()
  .demandCommand()
  .strict()
  .fail((_, error, yargs) => {
    if (!error) {
      yargs.showHelp();
      return;
    }
    throw error;
  });

export type Program = typeof program;
