import * as cdk from "aws-cdk-lib";
import * as sns from "aws-cdk-lib/aws-sns";
import * as subscriptions from "aws-cdk-lib/aws-sns-subscriptions";

import * as sst from "@serverless-stack/resources";

class MySampleStack extends sst.Stack {
  constructor(scope, id, props) {
    super(scope, id, props);

    // Create an SNS topic
    const topic = new sns.Topic(this, "MyTopic", {
      displayName: "Customer subscription topic",
    });

    // Create a Lambda function subscribed to the topic
    const snsFunc = new sst.Function(this, "MySnsLambda", {
      handler: "sub-folder/sns.handler",
      srcPath: "src/sns",
    });
    topic.addSubscription(new subscriptions.LambdaSubscription(snsFunc));

    // Create the HTTP API
    const api = new sst.Api(this, "Api", {
      defaultFunctionProps: {
        srcPath: "src/api",
        environment: {
          TOPIC_ARN: topic.topicArn,
        },
      },
      routes: {
        "GET /": "api.main",
      },
    });
    topic.grantPublish(api.getFunction("GET /"));

    // Show API endpoint in output
    new cdk.CfnOutput(this, "ApiEndpoint", {
      value: api.httpApi.apiEndpoint,
    });
  }
}

export default function main(app) {
  new MySampleStack(app, "sample");
}
