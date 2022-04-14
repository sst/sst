import { StackContext, Api } from "@serverless-stack/resources";
import { LayerVersion } from "aws-cdk-lib/aws-lambda";

export function MyStack({ stack, app }: StackContext) {
  // Configure thundra only for prod
  if (!app.local) {
    const thundraAWSAccountNo = 269863060030;
    const thundraNodeLayerVersion = 107; // Latest version at time of writing
    const thundraLayer = LayerVersion.fromLayerVersionArn(
      stack,
      "ThundraLayer",
      `arn:aws:lambda:${app.region}:${thundraAWSAccountNo}:layer:thundra-lambda-node-layer:${thundraNodeLayerVersion}`
    );
    stack.addDefaultFunctionLayers([thundraLayer]);

    stack.addDefaultFunctionEnv({
      THUNDRA_API_KEY: process.env.THUNDRA_API_KEY,
      NODE_OPTIONS: "-r @thundra/core/dist/bootstrap/lambda",
    });
  }

  // Create a HTTP API
  const api = new Api(stack, "Api", {
    defaults: {
      function: {
        bundle: {
          esbuildConfig: {
            plugins: "config/esbuild.js",
          },
        },
      },
    },
    routes: {
      "GET /": "lambda.handler",
    },
  });

  // Show the endpoint in the output
  stack.addOutputs({
    ApiEndpoint: api.url,
  });
}
