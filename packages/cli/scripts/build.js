"use strict";

const { sstSynth } = require("@serverless-stack/aws-cdk");

const { cacheCdkContext } = require("./config/cdkHelpers");

function printResults(results) {
  const stacks = results.stacks;
  const l = stacks.length;
  const stacksCopy = l === 1 ? "stack" : "stacks";

  console.log(`Successfully compiled ${l} ${stacksCopy}:`);

  for (var i = 0; i < l; i++) {
    const stack = stacks[i];
    console.log(`  - ${stack.id}`);
  }
}

module.exports = async function () {
  const results = await sstSynth();

  printResults(results);

  // Cache cdk.context.json
  cacheCdkContext();
};
