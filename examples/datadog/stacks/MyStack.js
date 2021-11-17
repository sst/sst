import { Datadog } from "datadog-cdk-constructs";
import * as sst from "@serverless-stack/resources";

export default class MyStack extends sst.Stack {
  constructor(scope, id, props) {
    super(scope, id, props);

    // Create a HTTP API
    const api = new sst.Api(this, "Api", {
      routes: {
        "GET /": "src/lambda.handler",
      },
    });

    // Configure Datadog
    const datadog = new Datadog(this, "Datadog", {
      nodeLayerVersion: 65,
      extensionLayerVersion: 13,
      apiKey: process.env.DATADOG_API_KEY,
    });

    // Monitor all functions in the stack
    datadog.addLambdaFunctions(this.getAllFunctions());

    // Show the endpoint in the output
    this.addOutputs({
      ApiEndpoint: api.url,
    });
  }
}
