#!/usr/bin/env node
/**
 * Based on https://github.com/facebook/create-react-app/blob/master/packages/react-scripts/bin/react-scripts.js
 */

"use strict";

// Makes the script crash on unhandled rejections instead of silently
// ignoring them. In the future, promise rejections that are not handled will
// terminate the Node.js process with a non-zero exit code.
process.on("unhandledRejection", (err) => {
  throw err;
});

const yargs = require("yargs");
const spawn = require("cross-spawn");

const args = process.argv.slice(2);

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

const scriptIndex = args.findIndex((x) => x === "test");
const script = scriptIndex === -1 ? args[0] : args[scriptIndex];
const nodeArgs = scriptIndex > 0 ? args.slice(0, scriptIndex) : [];

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
        describe: "Specify a stack, if you have multiple stacks",
      });
    }

    return yargs;
  };
}

const argv = yargs
  .usage(`${cmd.s} <command>`)
  .demandCommand(1)

  .command(
    cmd.build,
    "Build your app and prepare to deploy",
    addOptions(cmd.build)
  )
  .command(
    `${cmd.deploy} [stack]`,
    "Deploy your app to AWS",
    addOptions(cmd.deploy)
  )
  .command(
    `${cmd.remove} [stack]`,
    "Remove your app and all its resources",
    addOptions(cmd.remove)
  )

  .command(cmd.test, "Run your tests")
  .command(cmd.cdk, "Access the AWS CDK CLI")

  .example([
    [`$0 ${cmd.build}`, "Build using defaults"],
    [`$0 ${cmd.remove} my-s3-stack`, "Remove a specific stack"],
    [
      `$0 ${cmd.deploy} --stage prod --region us-west-1`,
      "Deploy to a stage and region",
    ],
  ])

  .help("h")
  .version()
  .alias("h", "help")
  .alias("v", "version")
  .epilogue("For more information, visit www.serverless-stack.com")

  .strictCommands(true)
  .wrap(yargs.terminalWidth())

  .fail((msg, err) => {
    if (err) throw err;

    yargs.showHelp();

    process.exit(0);
  })
  .parse();

switch (script) {
  case cmd.build:
  case cmd.deploy:
  case cmd.remove:
    internals[script](argv);
    break;
  case cmd.cdk:
  case cmd.test: {
    const result = spawn.sync(
      "node",
      nodeArgs
        .concat(require.resolve("../scripts/" + script))
        .concat(args.slice(scriptIndex + 1)),
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
