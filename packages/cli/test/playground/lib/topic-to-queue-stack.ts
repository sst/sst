import * as sst from "@serverless-stack/resources";

export class MainStack extends sst.Stack {
  constructor(scope: sst.App, id: string, props?: sst.StackProps) {
    super(scope, id, props);

    const queue1 = new sst.Queue(this, "MyQueue1", {
      consumer: "src/lambda.main",
    });
    const queue2 = new sst.Queue(this, "MyQueue2", {
      consumer: "src/lambda.main",
    });

    const topic = new sst.Topic(this, "MyTopic", {
      subscribers: [queue1, queue2],
    });

    this.addOutputs({
      TopicName: topic.topicName,
    });
  }
}
