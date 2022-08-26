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
  const parameters = await FunctionConfig.listParameters(app, stage, region);
  const keys = Object.keys(parameters);

  if (keys.length === 0) {
    logger.info(`No parameters found for the ${stage} stage.`);
  }
  else if (argv.format === "env") {
    printParametersInEnvFormat(parameters);
  }
  else {
    printParametersInTableFormat(parameters);
  }
}

async function handleGet(argv, app, stage, region) {
  const { name } = argv;
  const parameter = await FunctionConfig.getParameter(app, stage, region, name);
  if (parameter) {
    logger.info(chalk.bold(parameter));
  } else {
    logger.info(`${name} is not set. To set it, run`);
    logger.info("");
    logger.info(chalk.bold(`  sst parameters set ${name} <value>`));
  }
}

async function handleSet(argv, app, stage, region) {
  const { name, value } = argv;
  await FunctionConfig.setParameter(app, stage, region, name, value);
  logger.info("\n✅ Updated");
}

async function handleRemove(argv, app, stage, region) {
  const { name } = argv;
  await FunctionConfig.removeParameter(app, stage, region, name);
  logger.info("\n✅ Removed");
}

function printParametersInEnvFormat(secrets) {
  const keys = Object.keys(secrets);
  keys.sort().forEach((key) => {
    logger.info(`${key}=${secrets[key].value || secrets[key].fallbackValue}`);
  });
}

function printParametersInTableFormat(parameters) {
  console.log(parameters);
  const keys = Object.keys(parameters);
  const keyLen = Math.max(
    "Parameters".length,
    ...keys.map((key) => key.length),
  );
  const valueLen = Math.max(
    "Values".length,
    ...keys.map((key) => parameters[key].length
    ),
  );

  logger.info("┌".padEnd(keyLen + 3, "─") + "┬" + "".padEnd(valueLen + 2, "─") + "┐");
  logger.info(`│ ${"Parameters".padEnd(keyLen)} │ ${"Values".padEnd(valueLen)} │`);
  logger.info("├".padEnd(keyLen + 3, "─") + "┼" + "".padEnd(valueLen + 2, "─") + "┤");
  keys.sort().forEach((key) => {
    const value = parameters[key];
    logger.info(`│ ${key.padEnd(keyLen)} │ ${value.padEnd(valueLen)} │`);
  });
  logger.info("└".padEnd(keyLen + 3, "─") + "┴" + "".padEnd(valueLen + 2, "─") + "┘");
}