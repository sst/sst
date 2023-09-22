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
  .option("role", {
    type: "string",
    describe: "ARN of the IAM role to use when invoking AWS",
  })
  .option("future", {
    type: "boolean",
    describe: "DO NOT USE. For enabling untested, experimental features",
  })
  .group(["stage", "profile", "region", "role", "verbose", "help"], "Global:")
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
  .fail(async (_, error, yargs) => {
    if (!error) {
      yargs.showHelp();
      process.exit(1);
    }
    throw error;
  });

export type Program = typeof program;

const startAt = Date.now();

export async function exitWithError(error: Error) {
  const { trackCliFailed } = await import("./telemetry/telemetry.js");
  await trackCliFailed({
    rawCommand: process.argv.slice(2).join(" "),
    duration: Date.now() - startAt,
    errorName: error.name,
    errorMessage: error.message,
  });

  throw error;
}

export async function exit(code?: number) {
  const { trackCliSucceeded } = await import("./telemetry/telemetry.js");
  await trackCliSucceeded({
    rawCommand: process.argv.slice(2).join(" "),
    duration: Date.now() - startAt,
  });

  process.exit(code);
}

export async function trackDevError(error: Error) {
  const { trackCliDevError } = await import("./telemetry/telemetry.js");
  await trackCliDevError({
    rawCommand: process.argv.slice(2).join(" "),
    duration: Date.now() - startAt,
    errorName: error.name,
    errorMessage: error.message,
  });
}

export async function trackDevRunning() {
  const { trackCliDevRunning } = await import("./telemetry/telemetry.js");
  await trackCliDevRunning({
    rawCommand: process.argv.slice(2).join(" "),
    duration: Date.now() - startAt,
  });
}
