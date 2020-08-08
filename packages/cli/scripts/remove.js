"use strict";

const { sstDestroy } = require("@serverless-stack/aws-cdk");

module.exports = function (argv) {
  sstDestroy(argv.stack);
};
