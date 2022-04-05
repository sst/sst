import * as cdk from "aws-cdk-lib";
import * as sns from "aws-cdk-lib/aws-sns";
import * as sst from "@serverless-stack/resources";

class MySampleStack extends sst.Stack {
  constructor(scope, id, props) {
    super(scope, id, props);

    // Create an SNS topic
    const topic = new sst.Topic(this, "MyTopic", {
      subscribers: {
        0: {
          function: "src/sns/sub-folder/sns.handler",
          cdk: {
            subscription: {
              filterPolicy: {
                color: sns.SubscriptionFilter.stringFilter({
                  allowlist: ["red"],
                }),
              },
            },
          },
        },
      },
    });

    // Create the HTTP API
    const api = new sst.Api(this, "Api", {
      defaults: {
        function: {
          srcPath: "src/api",
          environment: {
            TOPIC_ARN: topic.topicArn,
          },
        },
      },
      routes: {
        "GET /": "api.main",
      },
    });
    api.attachPermissions([topic]);

    // Show API endpoint in output
    new cdk.CfnOutput(this, "ApiEndpoint", {
      value: api.url,
    });
  }
}

export default function main(app) {
  new MySampleStack(app, "sample");
}
