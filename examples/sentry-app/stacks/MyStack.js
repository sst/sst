import * as sst from "@serverless-stack/resources";
import { LayerVersion } from "@aws-cdk/aws-lambda";

export default class MyStack extends sst.Stack {
  constructor(scope, id, props) {
    super(scope, id, props);

    let sentry = LayerVersion.fromLayerVersionArn(
      this,
      "SentryLayer",
      `arn:aws:lambda:${scope.region}:943013980633:layer:SentryNodeServerlessSDK:35`
    );

    // Create a HTTP API
    const api = new sst.Api(this, "Api", {
      routes: {
        "GET /": "src/lambda.handler",
      },
    });

    if (!scope.local) {
      this.addDefaultFunctionLayers([sentry]);
      this.addDefaultFunctionEnv({
        SENTRY_DSN: process.env.SENTRY_DSN,
        SENTRY_TRACES_SAMPLE_RATE: "1.0",
        NODE_OPTIONS: "-r @sentry/serverless/dist/awslambda-auto",
      });
    }

    // Show the endpoint in the output
    this.addOutputs({
      ApiEndpoint: api.url,
    });
  }
}
