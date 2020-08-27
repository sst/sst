#!/usr/bin/env node

"use strict";

process.on("uncaughtException", (err) => {
  // Format any uncaught exceptions
  console.error("\n" + (err.stack || err) + "\n");
  process.exit(1);
});
process.on("unhandledRejection", (err) => {
  throw err;
});

require("source-map-support").install();

const fs = require("fs");
const path = require("path");
const yargs = require("yargs");
const chalk = require("chalk");
const spawn = require("cross-spawn");

const packageJson = require("../package.json");
const paths = require("../scripts/config/paths");
const cdkOptions = require("../scripts/config/cdkOptions");
const { prepareCdk } = require("../scripts/config/cdkHelpers");

const sstVersion = packageJson.version;
const cdkVersion = getCdkVersion();

const args = process.argv.slice(2);

const script = args[0];
const scriptArgs = args.slice(1);

const cmd = {
  s: "sst",
  cdk: "cdk",
  test: "test",
  build: "build",
  deploy: "deploy",
  remove: "remove",
};

const internals = {
  [cmd.build]: require("../scripts/build"),
  [cmd.deploy]: require("../scripts/deploy"),
  [cmd.remove]: require("../scripts/remove"),
};

function getCdkVersion() {
  const sstCdkVersion = packageJson.dependencies["@serverless-stack/aws-cdk"];
  return sstCdkVersion.match(/^(\d+\.\d+.\d+)/)[1];
}

function getCliInfo() {
  const usingYarn = fs.existsSync(path.join(paths.appPath, "yarn.lock"));

  return {
    cdkVersion,
    yarn: usingYarn,
    npm: !usingYarn,
    // Options that'll be passed into CDK
    cdkOptions: {
      ...cdkOptions,
      verbose: argv.verbose ? 2 : 0,
      noColor: argv.noColor || chalk.level === 0,
    },
  };
}

function addOptions(currentCmd) {
  return function (yargs) {
    yargs
      .option("stage", {
        describe: "The stage you want to deploy to",
      })
      .option("region", {
        describe: "The region you want to deploy to",
      });

    if (currentCmd === cmd.deploy || currentCmd === cmd.remove) {
      yargs.positional("stack", {
        type: "string",
        describe: "Specify a stack, if you have multiple stacks",
      });
    }
  };
}

const argv = yargs
  .parserConfiguration({ "boolean-negation": false })

  .usage(`${cmd.s} <command>`)
  .demandCommand(1)

  .option("no-color", {
    default: false,
    type: "boolean",
    desc: "Remove colors and other style from console output",
  })
  .option("verbose", {
    default: false,
    type: "boolean",
    desc: "Show debug info in logs",
  })

  .command(
    cmd.build,
    "Build your app and synthesize your stacks",
    addOptions(cmd.build)
  )
  .command(
    `${cmd.deploy} [stack]`,
    "Deploy all your stacks to AWS",
    addOptions(cmd.deploy)
  )
  .command(
    `${cmd.remove} [stack]`,
    "Remove all your stacks and all of their resources from AWS",
    addOptions(cmd.remove)
  )

  .command(cmd.test, "Run your tests")
  .command(cmd.cdk, "Access the forked AWS CDK CLI")

  .example([
    [`$0 ${cmd.build}`, "Build using defaults"],
    [`$0 ${cmd.remove} my-s3-stack`, "Remove a specific stack"],
    [
      `$0 ${cmd.deploy} --stage prod --region us-west-1`,
      "Deploy to a stage and region",
    ],
  ])

  .version(
    true,
    "Show the version of sst and cdk",
    `sst: ${sstVersion}\ncdk: ${cdkVersion}`
  )
  .alias("version", "v")
  .help("help")
  .alias("help", "h")
  .epilogue("For more information, visit www.serverless-stack.com")

  .wrap(yargs.terminalWidth())

  .fail((msg, err) => {
    if (err) throw err;

    console.log(chalk.red(msg) + "\n");

    yargs.showHelp();

    process.exit(1);
  })
  .parse();

if (!process.stdout.isTTY) {
  chalk.level = 0;
}

if (argv.verbose) {
  process.env.DEBUG = true;
}

switch (script) {
  case cmd.build:
  case cmd.deploy:
  case cmd.remove: {
    const cliInfo = getCliInfo();

    // Prepare app
    const config = prepareCdk(argv, cliInfo);

    Promise.resolve(internals[script](argv, config, cliInfo));
    break;
  }
  case cmd.cdk:
  case cmd.test: {

    if (script === cmd.cdk) {
      // Prepare app before running forked CDK commands
      const cliInfo = getCliInfo();
      prepareCdk(argv, cliInfo);
    }

    const result = spawn.sync(
      "node",
      [require.resolve("../scripts/" + script)].concat(scriptArgs),
      { stdio: "inherit" }
    );
    if (result.signal) {
      if (result.signal === "SIGKILL") {
        console.log(
          "The command failed because the process exited too early. " +
            "This probably means the system ran out of memory or someone called " +
            "`kill -9` on the process."
        );
      } else if (result.signal === "SIGTERM") {
        console.log(
          "The command failed because the process exited too early. " +
            "Someone might have called `kill` or `killall`, or the system could " +
            "be shutting down."
        );
      }
      process.exit(1);
    }
    process.exit(result.status);
    break;
  }
  default:
    console.log('Unknown script "' + script + '".');
    break;
}
