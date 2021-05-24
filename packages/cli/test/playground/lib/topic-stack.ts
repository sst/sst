import * as sst from "@serverless-stack/resources";

export class MainStack extends sst.Stack {
  constructor(scope: sst.App, id: string, props?: sst.StackProps) {
    super(scope, id, props);

    const topic = new sst.Topic(this, "Topic", {
      defaultFunctionProps: {
        timeout: 3,
      },
      subscribers: ["src/lambda.main"],
    });

    this.addOutputs({
      TopicName: topic.snsTopic.topicName,
    });
  }
}
