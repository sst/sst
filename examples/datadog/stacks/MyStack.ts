import { Datadog } from "datadog-cdk-constructs-v2";
import { StackContext, Api } from "@serverless-stack/resources";

export function MyStack({ stack, app }: StackContext) {
  // Create a HTTP API
  const api = new Api(stack, "Api", {
    routes: {
      "GET /": "functions/lambda.handler",
    },
  });

  // Configure Datadog only in prod
  if (!app.local) {
    // Configure Datadog
    const datadog = new Datadog(stack, "Datadog", {
      nodeLayerVersion: 86,
      extensionLayerVersion: 36,
      apiKey: process.env.DATADOG_API_KEY,
    });

    // Monitor all functions in the stack
    datadog.addLambdaFunctions(this.getAllFunctions());
  }

  // Show the endpoint in the output
  stack.addOutputs({
    ApiEndpoint: api.url,
  });
}
