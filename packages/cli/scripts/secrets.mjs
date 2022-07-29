import chalk from "chalk";
import {
  getChildLogger,
  FunctionConfig,
} from "@serverless-stack/core";

const logger = getChildLogger("client");

export default async function (argv, config) {
  const { name: app, stage, region } = config;
  const { action } = argv;

  logger.info("");

  if (action === "list") {
      await handleList(argv, app, stage, region);
  } else if (action === "get") {
      await handleGet(argv, app, stage, region);
  } else if (action === "set") {
      await handleSet(argv, app, stage, region);
  } else if (action === "remove") {
      await handleRemove(argv, app, stage, region);
  }

  logger.info("");
}

async function handleList(argv, app, stage, region) {
  const { fallback } = argv;
  const secrets = fallback
    ? await FunctionConfig.listSecretsFallback(app, region)
    : await FunctionConfig.listSecrets(app, stage, region);
  const keys = Object.keys(secrets);

  if (keys.length === 0) {
    fallback
      ? logger.info(`No fallback secrets found for the ${stage} stage.`)
      : logger.info(`No secrets found for the ${stage} stage.`);
  }
  else {
    const data = {};
    keys.forEach((key) => {
      data[key] = secrets[key].value
        ? secrets[key].value
        : `${secrets[key].fallbackValue} (fallback)`;
    });
    printTable(data);
  }
}

async function handleGet(argv, app, stage, region) {
  const { name, fallback } = argv;
  const secret = fallback
    ? await FunctionConfig.getSecretFallback(app, region, name)
    : await FunctionConfig.getSecret(app, stage, region, name);
  if (secret.value) {
    logger.info(chalk.bold(secret.value));
  }
  if (secret.fallbackValue) {
    logger.info(`${chalk.bold(secret.fallbackValue)} (fallback)`);
  }
  else {
    logger.info(fallback
      ? `Fallback value for ${name} is not set. To set it, run`
      : `${name} is not set. To set it, run`
    );
    logger.info("");
    logger.info(fallback
      ? chalk.bold(`  sst secrets set ${name} <value> --fallback`)
      : chalk.bold(`  sst secrets set ${name} <value>`)
    );
  }
}

async function handleSet(argv, app, stage, region) {
  const { name, value, fallback } = argv;
  fallback
    ? await FunctionConfig.setSecretFallback(app, region, name, value)
    : await FunctionConfig.setSecret(app, stage, region, name, value);
  logger.info("✅ Updated");
}

async function handleRemove(argv, app, stage, region) {
  const { name, fallback } = argv;
  fallback
    ? await FunctionConfig.removeSecretFallback(app, region, name)
    : await FunctionConfig.removeSecret(app, stage, region, name);
  logger.info("✅ Removed");
}

function printTable(data) {
  const keys = Object.keys(data);
  const values = Object.values(data);
  const keyLen = Math.max("Secrets".length, ...keys.map((key) => key.length));
  const valueLen = Math.max("Values".length, ...values.map((value) => value.length));
  logger.info("┌".padEnd(keyLen + 3, "─") + "┬" + "".padEnd(valueLen + 2, "─") + "┐");
  logger.info(`│ ${"Secrets".padEnd(keyLen)} │ ${"Values".padEnd(valueLen)} │`);
  logger.info("├".padEnd(keyLen + 3, "─") + "┼" + "".padEnd(valueLen + 2, "─") + "┤");
  Object.entries(data).forEach(([key, value]) => {
    logger.info(`│ ${key.padEnd(keyLen)} │ ${value.padEnd(valueLen)} │`);
  });
  logger.info("└".padEnd(keyLen + 3, "─") + "┴" + "".padEnd(valueLen + 2, "─") + "┘");
}