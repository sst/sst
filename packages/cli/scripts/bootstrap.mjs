import { Bootstrap } from "@serverless-stack/core";

export default async function (argv, config, cliInfo) {
  await Bootstrap.bootstrap(config, cliInfo);
}