import * as sst from "@serverless-stack/resources";

export default class MyStack extends sst.Stack {
  constructor(scope, id, props) {
    super(scope, id, props);

    // Create a HTTP API
    const api = new sst.Api(this, "Api", {
      routes: {
        "POST /": {
          function: {
            handler: "src/lambda.handler",
            environment: {
              PLANETSCALE_TOKEN: process.env.PLANETSCALE_TOKEN,
              PLANETSCALE_TOKEN_NAME: process.env.PLANETSCALE_TOKEN_NAME,
              PLANETSCALE_ORG: process.env.PLANETSCALE_ORG,
              PLANETSCALE_DB: process.env.PLANETSCALE_DB,
            },
          },
        },
      },
    });

    // Show the endpoint in the output
    this.addOutputs({
      ApiEndpoint: api.url,
    });
  }
}
