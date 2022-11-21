"use strict";

const index = require("./index");

const handler = async (event) => {
  try {
    // environment will get replaced by an object of environment key-value pairs
    const environment = "{{ _SST_NEXTJS_SITE_ENVIRONMENT_ }}";
    // @ts-ignore
    process.env = { ...process.env, ...environment };
  } catch (e) {
    console.log("Failed to set SST NextjsSite environment.");
    console.log(e);
  }

  return await index.handler(event);
};

exports.handler = handler;
