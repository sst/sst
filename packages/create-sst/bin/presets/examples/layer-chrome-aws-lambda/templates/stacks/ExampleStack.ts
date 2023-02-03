import { LayerVersion } from "aws-cdk-lib/aws-lambda";
import { Api, StackContext } from "sst/constructs";

const layerArn =
  "arn:aws:lambda:us-east-1:764866452798:layer:chrome-aws-lambda:25";

export function ExampleStack({ stack }: StackContext) {
  const layer = LayerVersion.fromLayerVersionArn(stack, "Layer", layerArn);

  // Create a HTTP API
  const api = new Api(stack, "Api", {
    routes: {
      "GET /": {
        function: {
          handler: "functions/lambda.handler",
          // The chrome-aws-lambda layer currently does not work in Node.js 16
          runtime: "nodejs14.x",
          // Increase the timeout for generating screenshots
          timeout: 15,
          // Load Chrome in a Layer
          layers: [layer],
          // Exclude bundling it in the Lambda function
          nodejs: {
            esbuild: {
              externalModules: ["chrome-aws-lambda"],
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
