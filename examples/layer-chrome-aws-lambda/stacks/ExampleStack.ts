import * as lambda from "aws-cdk-lib/aws-lambda";
import { Api, StackContext } from "sst/constructs";

export function ExampleStack({ stack }: StackContext) {
  const layerChromium = new lambda.LayerVersion(stack, "chromiumLayers", {
    code: lambda.Code.fromAsset("layers/chromium"),
  });

  // Create a HTTP API
  const api = new Api(stack, "Api", {
    routes: {
      "GET /": {
        function: {
          handler: "packages/functions/src/lambda.handler",
          runtime: "nodejs18.x",
          // Increase the timeout for generating screenshots
          timeout: 15,
          // Load Chrome in a Layer
          layers: [layerChromium],
          // Exclude bundling it in the Lambda function
          nodejs: {
            esbuild: {
              external: ["@sparticuz/chromium"],
            },
          },
        },
      },
    },
  });

  // Show the endpoint in the output
  stack.addOutputs({
    ApiEndpoint: api.url,
  });
}
