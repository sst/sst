import * as sst from "@serverless-stack/resources";
import * as cdk from "@aws-cdk/core";
import * as lambda from "@aws-cdk/aws-lambda";
import * as apig from "@aws-cdk/aws-apigatewayv2";
import * as apigIntegrations from "@aws-cdk/aws-apigatewayv2-integrations";

class MySampleStack extends sst.Stack {
  constructor(scope, id, props) {
    super(scope, id, props);

    const { stage, name } = this.node.root;

    const func = new sst.Function(this, "MyLambda", {
      code: lambda.Code.fromAsset("src"),
      handler: "hello.handler",
      timeout: cdk.Duration.seconds(6),
      runtime: lambda.Runtime.NODEJS_12_X,
      memorySize: 1024,
    });

    const api = new apig.HttpApi(this, "Api");
    api.addRoutes({
      integration: new apigIntegrations.LambdaProxyIntegration({
        handler: func,
      }),
      methods: [apig.HttpMethod.GET],
      path: "/",
    });

    new cdk.CfnOutput(this, "ApiEndpoint", {
      exportName: `${stage}-${name}-ApiEndpoint`,
      value: api.apiEndpoint,
    });
  }
}

export default function main(app) {
  new MySampleStack(app, "sample");
}
