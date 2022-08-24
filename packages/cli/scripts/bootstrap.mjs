import { Bootstrap } from "@serverless-stack/core";

export default async function (argv, config, cliInfo) {
  const tags = {};
  argv.tags.forEach((p) => {
    const [key, ...parts] = p.split("=");
    const value = parts.join("=");

    // validate tag
    if (!key || value === "") {
      throw new Error(`Invalid tag ${p}`);
    }

    tags[key] = value;
  });

  await Bootstrap.bootstrap(config, cliInfo, {
    tags,
    force: true,
  });
}