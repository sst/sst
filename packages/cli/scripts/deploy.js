"use strict";

const fs = require("fs");
const path = require("path");
const {
  sstEnv,
  sstDeploy,
  sstBootstrap,
} = require("@serverless-stack/aws-cdk");

const paths = require("./config/paths");
const { cacheCdkContext } = require("./config/cdkHelpers");

function envObjectToString(envObj) {
  return `aws://${envObj.account}/${envObj.region}`;
}

function hasBootstrappedEnv(env) {
  const contextPath = path.join(paths.appBuildPath, "cdk.context.json");
  const context = fs.existsSync(contextPath) ? require(contextPath) : {};

  return context.bootstrappedEnvs
    ? context.bootstrappedEnvs[env] === true
    : false;
}

function cacheBootstrap(env) {
  const contextPath = path.join(paths.appBuildPath, "cdk.context.json");
  const context = fs.existsSync(contextPath) ? require(contextPath) : {};

  context.bootstrappedEnvs = context.bootstrappedEnvs || {};
  context.bootstrappedEnvs[env] = true;

  fs.writeFileSync(contextPath, JSON.stringify(context, null, 2));
}

async function checkAndRunBootstrap(config) {
  const envResults = await sstEnv();

  if (!envResults.environment.account) {
    throw "AWS profile could not be detected. Please make sure you have it configured locally.";
  }

  // Apply region from config
  envResults.environment.region = config.region;

  // Run bootstrap if not previously run
  const env = envObjectToString(envResults.environment);

  if (hasBootstrappedEnv(env)) {
    return;
  }

  console.log("New environment detected...");

  const bsCall = await sstBootstrap();
  // Cache Bootstrap results
  cacheBootstrap(bsCall.environment.name);
}

module.exports = async function (argv, config) {
  await checkAndRunBootstrap(config);

  sstDeploy(argv.stack);

  // Cache cdk.context.json
  cacheCdkContext();
};
