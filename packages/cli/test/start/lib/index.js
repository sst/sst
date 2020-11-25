import * as sst from "@serverless-stack/resources";
import * as cdk from "@aws-cdk/core";
import * as lambda from "@aws-cdk/aws-lambda";
import * as sns from "@aws-cdk/aws-sns";
import * as subscriptions from "@aws-cdk/aws-sns-subscriptions";
import * as apig from "@aws-cdk/aws-apigatewayv2";
import * as apigIntegrations from "@aws-cdk/aws-apigatewayv2-integrations";

class MySampleStack extends sst.Stack {
  constructor(scope, id, props) {
    super(scope, id, props);

    const { stage, name } = this.node.root;

    const topic = new sns.Topic(this, "MyTopic", {
      displayName: "Customer subscription topic",
    });
    const snsFunc = new sst.Function(this, "MySnsLambda", {
      code: lambda.Code.fromAsset("src"),
      handler: "sns.handler",
      timeout: cdk.Duration.seconds(600),
      runtime: lambda.Runtime.NODEJS_12_X,
      memorySize: 1024,
    });
    topic.addSubscription(new subscriptions.LambdaSubscription(snsFunc));

    const apiFunc = new sst.Function(this, "MyApiLambda", {
      code: lambda.Code.fromAsset("src"),
      handler: "hello.handler",
      timeout: cdk.Duration.seconds(600),
      runtime: lambda.Runtime.NODEJS_12_X,
      memorySize: 1024,
      environment: {
        DRINK: "COFFEE",
        TOPIC_ARN: topic.topicArn,
      },
    });
    topic.grantPublish(apiFunc);
    const api = new apig.HttpApi(this, "Api");
    api.addRoutes({
      integration: new apigIntegrations.LambdaProxyIntegration({
        handler: apiFunc,
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
