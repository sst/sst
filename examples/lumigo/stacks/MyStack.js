import * as sst from "@serverless-stack/resources";
import * as cdk from "@aws-cdk/core";

export default class MyStack extends sst.Stack {
  constructor(scope, id, props) {
    super(scope, id, props);

    // Create a HTTP API
    const api = new sst.Api(this, "Api", {
      routes: {
        "GET /": "src/lambda.handler",
      },
    });

    cdk.Tags.of(api.getFunction('GET /')).add("lumigo:auto-trace", "true");

    // Show the endpoint in the output
    this.addOutputs({
      "ApiEndpoint": api.url,
    });
  }
}
