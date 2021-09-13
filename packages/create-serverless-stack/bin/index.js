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
const yargs = require("yargs");
const chalk = require("chalk");
const spawn = require("cross-spawn");
const camelCase = require("camelcase");
const unzipper = require("unzipper");
const https = require("https");

const paths = require("../config/paths");

const cmd = "create-serverless-stack";

const languageTypeCopy = {
  go: "Go",
  csharp: "C#",
  fsharp: "F#",
  python: "Python",
  javascript: "JavaScript",
  typescript: "TypeScript",
};

const commandDesc = "Initialize a template for your Serverless Stack app";
const argBuilder = (yargs) =>
  yargs.positional("name", {
    type: "string",
    describe: "The name of your Serverless Stack app",
  });

const argv = yargs
  .usage(`${cmd} [name]`)

  .command("* [name]", commandDesc, argBuilder)
  // TODO: Remove deprecated command later
  .command({
    command: "resources [name]",
    desc: commandDesc,
    deprecated: true,
    builder: argBuilder,
  })

  .option("use-yarn", {
    type: "boolean",
    default: false,
    describe: "Use Yarn instead of npm",
  })
  .option("example", {
    type: "string",
    default: false,
    describe: "Create a project from our examples repository",
  })
  .option("language", {
    type: "string",
    default: "javascript",
    choices: ["javascript", "typescript", "python", "go", "csharp", "fsharp"],
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

const example = argv.example;
const appName = argv.name || argv.example || "my-sst-app";
const templateLanguage = argv.language;
const useYarn = argv.useYarn;

const sstVersion = require("../package.json").version;
const cdkVersion = fs.readFileSync(path.join(paths.ownPath, "CDK_VERSION"));

const appPath = path.join(paths.parentPath, appName);
const templatePath = path.join(paths.ownTemplatesPath, templateLanguage);

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
  const stackName = "my-stack";
  return str
    .replace(
      new RegExp(`"name": "@serverless-stack/${example}"`, "gi"),
      `"name": "${appName}"`
    )
    .replace(new RegExp(`"name": "${example}"`, "gi"), `"name": "${appName}"`)
    .replace(/%name%/g, appName)
    .replace(/%stack-name%/g, stackName)
    .replace(/%cdk-version%/g, cdkVersion)
    .replace(/%sst-version%/g, sstVersion)
    .replace(/%name\.camelCased%/g, camelCase(appName))
    .replace(/%package-manager%/g, useYarn ? "yarn" : "npm")
    .replace(/%name\.PascalCased%/g, camelCase(appName, { pascalCase: true }))
    .replace(
      /%stack-name.PascalCased%/g,
      camelCase(stackName, { pascalCase: true })
    );
}

function processFile(templatePath, toFile) {
  const template = fs.readFileSync(templatePath, { encoding: "utf-8" });
  fs.writeFileSync(toFile, processString(template));
}

function printSuccess() {
  console.log(`Success! Created ${appName} in ${appPath}`);
  console.log("You can run:");
  console.log("");
  console.log("  " + chalk.cyan(getUserCmd("start")));
  console.log("    Start the local development environment");
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
  console.log("    Remove all your stacks and all their resources from AWS");
  console.log("");
  console.log("To get started:");
  console.log("");
  console.log("  " + chalk.cyan("cd ") + appName);
  console.log("  " + chalk.cyan(getUserCmd("start")));
  console.log("");
  console.log("Have fun!");
}

function fromTemplate(sourceDirectory, targetDirectory) {
  const files = fs.readdirSync(sourceDirectory);

  for (var i = 0, l = files.length; i < l; i++) {
    const file = files[i];

    const fromFile = path.join(sourceDirectory, file);
    const toFile = path.join(targetDirectory, processString(file));

    if (fs.statSync(fromFile).isDirectory()) {
      fs.mkdirSync(toFile);
      fromTemplate(fromFile, toFile);
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

function fromExample(example, name, targetDirectory) {
  return new Promise((resolve, reject) => {
    info("Creating example: " + example);
    https.get(
      "https://codeload.github.com/serverless-stack/serverless-stack/zip/refs/heads/master",
      async (response) => {
        const extract = unzipper.Extract({ path: process.cwd() });
        response.pipe(extract);
        await extract.promise();
        fs.renameSync(
          path.join("serverless-stack-master/examples/", example),
          targetDirectory
        );
        fs.rmdirSync("serverless-stack-master", { recursive: true });
        const package_json = path.join(targetDirectory, "package.json");
        const sst_json = path.join(targetDirectory, "sst.json");
        processFile(package_json, package_json);
        processFile(sst_json, sst_json);
        resolve();
      }
    );
  });
}

(async function () {
  const languageCopy = languageTypeCopy[templateLanguage];

  info(`\nInitializing a new Serverless Stack ${languageCopy} project`);

  info(`Creating ${appName}/ directory`);

  // Create app directory
  if (fs.existsSync(appPath)) {
    error(`A directory called ${appName} already exists.`);
    process.exit(1);
  }
  fs.mkdirSync(appPath);

  if (example) await fromExample(example, appName, appPath);
  if (!example) {
    info("Creating template for: " + templateLanguage);
    fromTemplate(templatePath, appPath);
  }

  info("Installing packages");

  // Install dependencies
  const [cmd, args] = useYarn ? ["yarn", []] : ["npm", ["install"]];

  const results = spawn.sync(cmd, args, {
    stdio: "inherit",
    cwd: appPath,
  });

  if (results.error) throw results.error;
  if (results.status !== 0) {
    error("There was a problem installing the packages");
    process.exit(1);
  }

  // Install Go dependencies
  if (templateLanguage === "go") {
    const results = spawn.sync("go", ["mod", "tidy"], {
      stdio: "inherit",
      cwd: appPath,
    });

    if (results.error) throw results.error;
    if (results.status !== 0) {
      error("There was a problem installing the modules");
      process.exit(1);
    }
  }

  printSuccess();
})();
