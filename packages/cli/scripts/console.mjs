import {
  getChildLogger,
  useLocalServer,
  Runtime,
} from "@serverless-stack/core";
import detect from "detect-port-alt";
import chalk from "chalk";

const logger = getChildLogger("client");

export default async function (_argv, config) {
  const local = useLocalServer({
    port: await chooseServerPort(13557),
    app: config.name,
    stage: config.stage,
    region: config.region,
    live: false,
  });
  new Runtime.Server({
    port: await chooseServerPort(12557),
  }).listen();
  const url = `https://console.sst.dev/${config.name}/${
    config.stage
  }/stacks${local.port !== 13557 ? "?_port=" + local.port : ""}`;
  console.log("SST Console:", url);
  // openBrowser(url);
}

async function chooseServerPort(defaultPort) {
  const host = "0.0.0.0";
  logger.debug(`Checking port ${defaultPort} on host ${host}`);

  try {
    return detect(defaultPort, host);
  } catch (err) {
    throw new Error(
      chalk.red(`Could not find an open port at ${chalk.bold(host)}.`) +
        "\n" +
        ("Network error message: " + err.message || err) +
        "\n"
    );
  }
}
