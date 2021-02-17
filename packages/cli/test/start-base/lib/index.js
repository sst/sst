import * as cdk from "@aws-cdk/core";
import * as sns from "@aws-cdk/aws-sns";

import * as sst from "@serverless-stack/resources";

class MySampleStack extends sst.Stack {
  constructor(scope, id, props) {
    super(scope, id, props);

    // Create an SNS topic
    const topic = new sns.Topic(this, "MyTopic", {
      displayName: "Customer subscription topic",
    });
    new cdk.CfnOutput(this, "TopicArn", {
      value: topic.topicArn,
    });
  }
}

export default function main(app) {
  new MySampleStack(app, "sample");
}
