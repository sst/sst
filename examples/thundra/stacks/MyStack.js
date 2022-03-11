import * as sst from "@serverless-stack/resources";
import { LayerVersion } from "aws-cdk-lib/aws-lambda";

export default class MyStack extends sst.Stack {
  constructor(scope, id, props) {
    super(scope, id, props);

    // Configure thundra only for prod
    if (!scope.local) {
      const thundraAWSAccountNo = 269863060030;
      const thundraNodeLayerVersion = 107; // Latest version at time of writing
      const thundraLayer = LayerVersion.fromLayerVersionArn(
        this,
        "ThundraLayer",
        `arn:aws:lambda:${scope.region}:${thundraAWSAccountNo}:layer:thundra-lambda-node-layer:${thundraNodeLayerVersion}`
      );
      this.addDefaultFunctionLayers([thundraLayer]);

      this.addDefaultFunctionEnv({
        THUNDRA_API_KEY: process.env.THUNDRA_API_KEY,
        NODE_OPTIONS: "-r @thundra/core/dist/bootstrap/lambda",
      });
    }

    // Create a HTTP API
    const api = new sst.Api(this, "Api", {
      defaultFunctionProps: {
        bundle: {
          esbuildConfig: {
            plugins: "config/esbuild.js",
          },
        },
      },
      routes: {
        "GET /": "src/lambda.handler",
      },
    });

    // Show the endpoint in the output
    this.addOutputs({
      ApiEndpoint: api.url,
    });
  }
}
