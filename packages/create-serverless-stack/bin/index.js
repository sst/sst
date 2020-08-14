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

const fs = require("fs");
const path = require("path");
const https = require("https");
const yargs = require("yargs");
const chalk = require("chalk");
const spawn = require("cross-spawn");
const camelCase = require("camelcase");
const execSync = require("child_process").execSync;

const paths = require("../config/paths");

const cmd = {
  i: "create-serverless-stack",
  r: "resources",
};

const templateTypeCopy = {
  resources: "Resources",
};
const languageTypeCopy = {
  javascript: "JavaScript",
  typescript: "TypeScript",
};

const argv = yargs
  .usage(`${cmd.i} <command>`)
  .demandCommand(1)

  .command(
    `${cmd.r} [name]`,
    "Initialize a template for the resources in your Serverless Stack",
    function (yargs) {
      yargs.positional("name", {
        type: "string",
        default: "my-serverless-resources",
        describe: "The name of your Serverless Stack app",
      });
    }
  )

  .option("use-yarn", {
    type: "boolean",
    default: false,
    describe: "Use Yarn instead of npm",
  })
  .option("language", {
    type: "string",
    default: "javascript",
    choices: ["javascript", "typescript"],
    describe: "The language of the template",
  })

  .version()
  .alias("version", "v")
  .help("help")
  .alias("help", "h")
  .epilogue("For more information, visit www.serverless-stack.com")

  .strictCommands(true)
  .wrap(yargs.terminalWidth())

  .fail((msg, err) => {
    if (err) throw err;

    error(msg + "\n");

    yargs.showHelp();

    process.exit(1);
  })
  .parse();

let cdkVersion;

const appName = argv.name;
const templateType = argv._[0];
const templateLanguage = argv.language;
const useYarn = argv.useYarn;

const appPath = path.join(paths.parentPath, appName);
const templatePath = path.join(
  paths.ownTemplatesPath,
  templateType,
  templateLanguage
);

(async function () {
  const templateCopy = templateTypeCopy[templateType];
  const languageCopy = languageTypeCopy[templateLanguage];

  info(
    `Initializing a new Serverless Stack ${templateCopy} ${languageCopy} project`
  );

  try {
    cdkVersion = await getLatestCdkVersion();
  } catch (e) {
    error("There was a problem connecting to the npm registry.");
    process.exit(1);
  }

  info(`Creating ${appName}/ directory`);

  // Create app directory
  if (!fs.existsSync(appPath)) {
    fs.mkdirSync(appPath);
  } else {
    error(`A directory called ${appName} already exists.`);
    process.exit(1);
  }

  info("Adding project files");

  // Copy template files to app directory
  copyFiles(templatePath, appPath);

  info("Installing packages");

  // Install dependencies
  let cmd;
  let args;
  if (useYarn) {
    cmd = "yarn";
    args = [];
  } else {
    cmd = "npm";
    args = ["install"];
  }

  const results = spawn.sync(cmd, args, {
    stdio: "inherit",
    cwd: appPath,
  });

  if (results.error) {
    throw results.error;
  } else if (results.status !== 0) {
    error("There was a problem installing the packages");
    process.exit(1);
  }

  printSuccess();
})();

function getUserCmd(action) {
  return useYarn ? `yarn run ${action}` : `npm run ${action}`;
}

/* eslint-disable no-unused-vars */
function debug(message) {
  if (!process.env.DEBUG) {
    return;
  }
  console.debug(chalk.grey("debug ") + message);
}

function info(message) {
  console.log(chalk.grey(message));
}

/* eslint-disable no-unused-vars */
function warn(message) {
  console.warn(chalk.yellow("warn ") + message);
}

function error(message) {
  console.error(chalk.red("error ") + message);
}

function processString(str) {
  const sstVersion = require("../package.json").version;
  return str
    .replace(/%name%/g, appName)
    .replace(/%cdk-version%/g, cdkVersion)
    .replace(/%sst-version%/g, sstVersion)
    .replace(/%name\.camelCased%/g, camelCase(appName))
    .replace(/%name\.PascalCased%/g, camelCase(appName, { pascalCase: true }));
}

function processFile(templatePath, toFile) {
  const template = fs.readFileSync(templatePath, { encoding: "utf-8" });
  fs.writeFileSync(toFile, processString(template));
}

function copyFiles(sourceDirectory, targetDirectory) {
  const files = fs.readdirSync(sourceDirectory);

  for (var i = 0, l = files.length; i < l; i++) {
    const file = files[i];

    const fromFile = path.join(sourceDirectory, file);
    const toFile = path.join(targetDirectory, processString(file));

    if (fs.statSync(fromFile).isDirectory()) {
      fs.mkdirSync(toFile);
      copyFiles(fromFile, toFile);
      continue;
    } else if (file.match(/^.*\.template\.[^.]+$/)) {
      processFile(fromFile, toFile.replace(/\.template(\.[^.]+)$/, "$1"));
      continue;
    } else if (file.match(/\.(swp|swo|DS_FILE)$/i)) {
      continue;
    } else {
      fs.copyFileSync(fromFile, toFile);
    }
  }
}

// Adopted from https://github.com/facebook/create-react-app/blob/master/packages/create-react-app/createReactApp.js
//
// We first check the registry directly via the API, and if that fails, we try
// the slower `npm view [package] version` command.
//
// This is important for users in environments where direct access to npm is
// blocked by a firewall, and packages are provided exclusively via a private
// registry.
async function getLatestCdkVersion() {
  function tryNpmCmd(resolve, reject) {
    try {
      resolve(execSync("npm view aws-cdk version").toString().trim());
    } catch (e) {
      reject();
    }
  }

  return new Promise((resolve, reject) => {
    https
      .get("https://registry.npmjs.org/-/package/aws-cdk/dist-tags", (res) => {
        if (res.statusCode === 200) {
          let body = "";
          res.on("data", (data) => (body += data));
          res.on("end", () => {
            resolve(JSON.parse(body).latest);
          });
        } else {
          tryNpmCmd(resolve, reject);
        }
      })
      .on("error", () => {
        tryNpmCmd(resolve, reject);
      });
  });
}

function printSuccess() {
  console.log(`Success! Created ${appName} in ${appPath}`);
  console.log("To get started:");
  console.log("");
  console.log("  " + chalk.cyan("cd ") + appName);
  console.log("");
  console.log("And run:");
  console.log("");
  console.log("  " + chalk.cyan(getUserCmd("test")));
  console.log("    Run your tests");
  console.log("");
  console.log("  " + chalk.cyan(getUserCmd("build")));
  console.log("    Build your app and synthesize your stacks");
  console.log("");
  console.log("  " + chalk.cyan(getUserCmd("deploy")));
  console.log("    Deploy all your stacks and create your AWS resources");
  console.log("");
  console.log("  " + chalk.cyan(getUserCmd("remove")));
  console.log("    Remove all your stacks and all of their resources from AWS");
  console.log("");
  console.log("Have fun!");
}
