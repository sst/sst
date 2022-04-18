import { LayerVersion } from "aws-cdk-lib/aws-lambda";
import { Api, StackContext } from "@serverless-stack/resources";

const layerArn =
  "arn:aws:lambda:us-east-1:764866452798:layer:chrome-aws-lambda:22";

export function MyStack({ stack }: StackContext) {
  const layer = LayerVersion.fromLayerVersionArn(stack, "Layer", layerArn);

  // Create a HTTP API
  const api = new Api(stack, "Api", {
    routes: {
      "GET /": {
        function: {
          handler: "lambda.handler",
          // Increase the timeout for generating screenshots
          timeout: 15,
          // Load Chrome in a Layer
          layers: [layer],
          // Exclude bundling it in the Lambda function
          bundle: { externalModules: ["chrome-aws-lambda"] },
        },
      },
    },
  });

  // Show the endpoint in the output
  stack.addOutputs({
    ApiEndpoint: api.url,
  });
}
