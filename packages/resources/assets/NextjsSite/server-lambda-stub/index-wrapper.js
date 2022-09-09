
"use strict";

const index = require("./server");

const handler = async (event) => {
  try {
    // We expose an environment variable token which is used by the code
    // replacer to inject the environment variables assigned to the
    // EdgeFunction construct.
    //
    // "{{ _SST_EDGE_FUNCTION_ENVIRONMENT_ }}" will get replaced during
    // deployment with an object of environment key-value pairs, ie.
    // const environment = {"API_URL": "https://api.example.com"};
    //
    // This inlining strategy is required as Lambda@Edge doesn't natively
    // support runtime environment variables. A downside of this approach
    // is that environment variables cannot be toggled after deployment,
    // each change to one requires a redeployment.
    const environment = "{{ _SST_EDGE_FUNCTION_ENVIRONMENT_ }}";
    process.env = { ...process.env, ...environment };
  } catch (e) {
    console.log("Failed to set SST Lambda@Edge environment.");
    console.log(e);
  }

  return await index.handler(event);
};

exports.handler = handler;
  