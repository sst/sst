import spawn from "cross-spawn";
import { getChildLogger, FunctionConfig } from "@serverless-stack/core";

const logger = getChildLogger("client");

export default async function (argv, config) {
  const { name: app, stage, region } = config;
  const { action } = argv;
  logger.info("");

  // Load config
  const parameters = await FunctionConfig.listParameters(app, stage, region);
  const secrets = await FunctionConfig.listSecrets(app, stage, region);

  // Set config as environment variables
  // Note that secrets are already decoded here. We are going to store
  // them in the environment variables as parameters, so the secret
  // values are not fetched again at runtime.
  const configEnv = {
    SST_APP: app,
    SST_STAGE: stage,
  };
  Object.keys(parameters).forEach((key) => {
    configEnv[`${FunctionConfig.PARAM_ENV_PREFIX}${key}`] = parameters[key];
  });
  Object.keys(secrets).forEach((key) => {
    configEnv[`${FunctionConfig.PARAM_ENV_PREFIX}${key}`] =
      secrets[key].value || secrets[key].fallbackValue;
  });

  // Spawn process
  spawn(argv._[1], argv._.slice(2), {
    stdio: "inherit",
    env: {
      ...process.env,
      ...configEnv,
    },
  }).on("exit", function (exitCode) {
    process.exit(exitCode);
  });

  logger.info("");
}
