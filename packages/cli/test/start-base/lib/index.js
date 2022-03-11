import * as cdk from "aws-cdk-lib";
import * as sns from "aws-cdk-lib/aws-sns";
import * as sst from "@serverless-stack/resources";

class MySampleStack extends sst.Stack {
  constructor(scope, id, props) {
    super(scope, id, props);

    // Create an SNS topic
    const topic = new sst.Topic(this, "MyTopic", {
      subscribers: [
        {
          function: "src/sns/sub-folder/sns.handler",
          subscriberProps: {
            filterPolicy: {
              color: sns.SubscriptionFilter.stringFilter({
                whitelist: ["red"],
              }),
            },
          },
        },
      ],
    });

    // Create the HTTP API
    const api = new sst.Api(this, "Api", {
      defaultFunctionProps: {
        srcPath: "src/api",
        environment: {
          TOPIC_ARN: topic.snsTopic.topicArn,
        },
      },
      routes: {
        "GET /": "api.main",
      },
    });
    api.attachPermissions([topic]);

    // Show API endpoint in output
    new cdk.CfnOutput(this, "ApiEndpoint", {
      value: api.httpApi.apiEndpoint,
    });
  }
}

export default function main(app) {
  new MySampleStack(app, "sample");
}
