import * as cdk from "@aws-cdk/core";
import * as apig from "@aws-cdk/aws-apigatewayv2";
import * as apigIntegrations from "@aws-cdk/aws-apigatewayv2-integrations";

import * as sst from "@serverless-stack/resources";

class ApiStack extends sst.Stack {
  constructor(scope, id, props) {
    super(scope, id, props);

    const a = 1;

    // Create a Lambda function triggered by an HTTP API
    const lambda = new sst.Function(this, "Lambda", {
      entry: "lambda.js",
      srcPath: "src",
    });

    // Create the HTTP API
    const api = new apig.HttpApi(this, "Api");
    api.addRoutes({
      path: "/",
      integration: new apigIntegrations.LambdaProxyIntegration({
        handler: lambda,
      }),
    });

    // Show API endpoint in output
    new cdk.CfnOutput(this, "ApiEndpoint", {
      value: api.apiEndpoint,
    });
  }
}

export default function(app) {
  new ApiStack(app, "api-stack");
}
