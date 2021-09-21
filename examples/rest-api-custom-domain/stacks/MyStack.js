import * as sst from "@serverless-stack/resources";

export default class MyStack extends sst.Stack {
  constructor(scope, id, props) {
    super(scope, id, props);

    const stage = this.node.root.stage;

    // Create the HTTP API
    const api = new sst.Api(this, "Api", {
      customDomain: `${stage}.example.com`,
      routes: {
        "GET /": "src/lambda.main",
      },
    });

    // Show the API endpoint in output
    this.addOutputs({
      ApiEndpoint: api.url,
    });
  }
}
