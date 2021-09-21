import * as sst from "@serverless-stack/resources";

export default class MyStack extends sst.Stack {
  constructor(scope, id, props) {
    super(scope, id, props);

    // Create a HTTP API
    const api = new sst.Api(this, "Api", {
      routes: {
        "GET /": {
          function: {
            bundle: false,
            srcPath: "src/",
            handler: "lambda.handler",
            environment: {
              MONGODB_URI: process.env.MONGODB_URI,
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
