import chalk from "chalk";
import { VisibleError } from "./error/index.js";
import { GlobalCLIOptionsContext } from "./cli.js";

console.time("cli");
process.on("uncaughtException", err => {
  console.log(chalk.red(err.message));
  console.log(
    chalk.blue(
      "Need help with this error? Join our discord https://discord.gg/sst and talk to the team"
    )
  );
  if (!(err instanceof VisibleError)) {
    console.log(chalk.yellow(err.stack));
  }
});

process.on("beforeExit", code => {
  console.timeEnd("cli");
});

import caporal from "@caporal/core";
import { Update } from "./commands/update.js";
import { Scrap } from "./commands/scrap.js";
import { Build } from "./commands/build.js";
import { Secrets } from "./commands/secrets.js";
import { analyze } from "./commands/analyze.js";
import { Deploy } from "./commands/deploy.js";
const { program } = caporal;

program
  .disableGlobalOption("silent")
  .disableGlobalOption("quiet")
  .disableGlobalOption("verbose")
  .disableGlobalOption("--no-color");

program
  .command("update", "Update SST and CDK packages to another version")
  .argument("[version]", "Optional version to update to")
  .action(req => {
    Update({
      version: req.args.version?.toString()
    });
  });

program
  .command("analyze", "Analyze function")
  .argument("[target]", "Function to analyze")
  .action(req => {
    analyze({
      target: req.args.target!.toString()
    });
  });

program
  .command("scrap", "Used to test arbitrary code")
  .option("--profile <profile>", "AWS profile to use")
  .option("--stage <stage>", "Stage to use")
  .action(req => {
    GlobalCLIOptionsContext.provide(req.options);
    Scrap();
  });

program
  .command("build", "Build stacks code")
  .option("--profile <profile>", "AWS profile to use")
  .option("--stage <stage>", "Stage to use")
  .action(req => {
    GlobalCLIOptionsContext.provide(req.options);
    Build();
  });

program
  .command("deploy", "Deploy stacks")
  .option("--profile <profile>", "AWS profile to use")
  .option("--stage <stage>", "Stage to use")
  .option("--from <from>", "Use prebuilt cloud assembly")
  .action(req => {
    GlobalCLIOptionsContext.provide(req.options);
    Deploy({
      from: req.options.from?.toString()
    });
  });

program
  .command("secrets", "")
  .option("--profile <profile>", "AWS profile to use")
  .option("--stage <stage>", "Stage to use")
  .action(req => {
    GlobalCLIOptionsContext.provide(req.options);
    Secrets();
  });

program.run();
