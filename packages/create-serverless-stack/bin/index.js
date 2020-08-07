#!/usr/bin/env node

"use strict";

// Makes the script crash on unhandled rejections instead of silently
// ignoring them. In the future, promise rejections that are not handled will
// terminate the Node.js process with a non-zero exit code.
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

function shouldUseYarn() {
  try {
    execSync("yarnpkg --version", { stdio: "ignore" });
    return true;
  } catch (e) {
    return false;
  }
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

async function main() {
  try {
    cdkVersion = await getLatestCdkVersion();
  } catch (e) {
    console.log(
      chalk.red("There was a problem connecting to the npm registry.")
    );
    process.exit(1);
  }

  // Create app directory
  if (!fs.existsSync(appPath)) {
    fs.mkdirSync(appPath);
  } else {
    console.log(chalk.red(`A directory called ${appName} already exists.`));
    process.exit(1);
  }

  // Copy template files to app directory
  copyFiles(templatePath, appPath);

  // Install dependencies
  if (useYarn) {
    spawn.sync("yarn", [], {
      stdio: "inherit",
      cwd: appPath,
    });
  } else {
    spawn.sync("npm", ["install"], {
      stdio: "inherit",
      cwd: appPath,
    });
  }
}

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

  .option("use-npm", {
    type: "boolean",
    default: false,
    describe: "Use npm instead of Yarn",
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

    console.log(chalk.red(msg) + "\n");

    yargs.showHelp();

    process.exit(1);
  })
  .parse();

let cdkVersion;

const appName = argv.name;
const templateType = argv._[0];
const templateLanguage = argv.language;
const useYarn = argv.useNpm ? false : shouldUseYarn();

const appPath = path.join(paths.parentPath, appName);
const templatePath = path.join(
  paths.ownTemplatesPath,
  templateType,
  templateLanguage
);

main();
