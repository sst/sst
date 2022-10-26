import chalk from "chalk";
import { getChildLogger, FunctionConfig } from "@serverless-stack/core";

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
  } else if (action === "set-fallback") {
    await handleSetFallback(argv, app, region);
  } else if (action === "remove") {
    await handleRemove(argv, app, stage, region);
  } else if (action === "remove-fallback") {
    await handleRemoveFallback(argv, app, region);
  }

  logger.info("");
}

async function handleList(argv, app, stage, region) {
  const secrets = await FunctionConfig.listSecrets(app, stage, region);
  const keys = Object.keys(secrets);

  if (keys.length === 0) {
    logger.info(`No secrets found for the ${stage} stage.`);
  } else if (argv.format === "env") {
    printSecretsInEnvFormat(secrets);
  } else {
    printSecretsInTableFormat(secrets);
  }
}

async function handleGet(argv, app, stage, region) {
  const { name } = argv;
  const secret = await FunctionConfig.getSecret(app, stage, region, name);
  if (secret.value) {
    logger.info(chalk.bold(secret.value));
  } else if (secret.fallbackValue) {
    logger.info(
      `${chalk.bold(secret.fallbackValue)} ${chalk.gray("(fallback)")}`
    );
  } else {
    logger.info(`${name} is not set. To set it, run`);
    logger.info("");
    logger.info(chalk.bold(`  sst secrets set ${name} <value>`));
  }
}

async function handleSet(argv, app, stage, region) {
  const { name, value } = argv;
  await FunctionConfig.setSecret(app, stage, region, name, value);
  logger.info("\n✅ Updated");
}

async function handleSetFallback(argv, app, region) {
  const { name, value } = argv;
  await FunctionConfig.setSecretFallback(app, region, name, value);
  logger.info("✅ Updated");
}

async function handleRemove(argv, app, stage, region) {
  const { name } = argv;
  await FunctionConfig.removeSecret(app, stage, region, name);
  logger.info("\n✅ Removed");
}

async function handleRemoveFallback(argv, app, region) {
  const { name } = argv;
  await FunctionConfig.removeSecretFallback(app, region, name);
  logger.info("✅ Removed");
}

function printSecretsInEnvFormat(secrets) {
  const keys = Object.keys(secrets);
  keys.sort().forEach((key) => {
    logger.info(`${key}=${secrets[key].value || secrets[key].fallbackValue}`);
  });
}

function printSecretsInTableFormat(secrets) {
  const keys = Object.keys(secrets);
  const keyLen = Math.max("Secrets".length, ...keys.map((key) => key.length));
  const valueLen = Math.max(
    "Values".length,
    ...keys.map((key) =>
      secrets[key].value
        ? secrets[key].value.length
        : `${secrets[key].fallbackValue} (fallback)`.length
    )
  );

  logger.info(
    "┌".padEnd(keyLen + 3, "─") + "┬" + "".padEnd(valueLen + 2, "─") + "┐"
  );
  logger.info(`│ ${"Secrets".padEnd(keyLen)} │ ${"Values".padEnd(valueLen)} │`);
  logger.info(
    "├".padEnd(keyLen + 3, "─") + "┼" + "".padEnd(valueLen + 2, "─") + "┤"
  );
  keys.sort().forEach((key) => {
    const value = secrets[key].value
      ? secrets[key].value
      : `${secrets[key].fallbackValue} ${chalk.gray("(fallback)")}`;
    logger.info(`│ ${key.padEnd(keyLen)} │ ${value.padEnd(valueLen)} │`);
  });
  logger.info(
    "└".padEnd(keyLen + 3, "─") + "┴" + "".padEnd(valueLen + 2, "─") + "┘"
  );
}
