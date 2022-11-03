import spawn from "cross-spawn";
import {
  getChildLogger,
  FunctionBinding,
} from "@serverless-stack/core";

const logger = getChildLogger("client");

export default async function (argv, config) {
  const { name: app, stage, region } = config;
  logger.info("");

  // Add deprecated warning
  if (argv._[0] === "load-config") {
    logger.warn(`\nWARNING: The "load-config" command is being renamed to "bind" and will be deprecated in SST v2. Read more about how to upgrade here — https://docs.serverless-stack.com/upgrade-guide#upgrade-to-v116`);
  }

  // Load default environment variables
  const defaultEnvs = {
    SST_APP: app,
    SST_STAGE: stage,
  };

  // Load binding environment variables
  const bindingEnvs = await FunctionBinding.loadBindingEnvironment(app, stage, region);

  // Spawn process
  spawn(argv._[1], argv._.slice(2), {
    stdio: "inherit",
    env: {
      ...process.env,
      ...defaultEnvs,
      ...bindingEnvs,
    },
  }).on("exit", function (exitCode) {
    process.exit(exitCode);
  });

  logger.info("");
}