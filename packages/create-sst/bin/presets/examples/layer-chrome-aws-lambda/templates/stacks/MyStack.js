import { LayerVersion } from "aws-cdk-lib/aws-lambda";
import * as sst from "@serverless-stack/resources";

const layerArn =
  "arn:aws:lambda:us-east-1:764866452798:layer:chrome-aws-lambda:22";

export default class MyStack extends sst.Stack {
  constructor(scope, id, props) {
    super(scope, id, props);

    const layer = LayerVersion.fromLayerVersionArn(this, "Layer", layerArn);

    // Create a HTTP API
    const api = new sst.Api(this, "Api", {
      routes: {
        "GET /": {
          function: {
            handler: "src/lambda.handler",
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
    this.addOutputs({
      ApiEndpoint: api.url,
    });
  }
}
