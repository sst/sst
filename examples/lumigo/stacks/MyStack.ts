import { Api, StackContext } from "@serverless-stack/resources";
import * as cdk from "aws-cdk-lib";

export function MyStack({ stack, app }: StackContext) {
  // Create a HTTP API
  const api = new Api(stack, "Api", {
    routes: {
      "GET /": "lambda.handler",
    },
  });

  // Enable auto trace only in prod
  if (!app.local)
    cdk.Tags.of(api.getFunction("GET /")).add("lumigo:auto-trace", "true");

  // Show the endpoint in the output
  stack.addOutputs({
    ApiEndpoint: api.url,
  });
}
