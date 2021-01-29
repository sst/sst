import * as sst from "@serverless-stack/resources";

export default class MiscStack extends sst.Stack {
  constructor(scope, id, props) {
    super(scope, id, props);

    const event = new sst.Topic(this, "Topic", {
      subscribers: [
        "services/misc/handler.snsSubscriber",
      ],
    });

    const queue = new sst.Queue(this, "Queue", {
      consumer: "services/misc/handler.sqsConsumer",
    });

    const cron = new sst.Scheduler(this, "Scheduler", {
      schedule: 'rate(1 minute)',
      job: {
        handler: "services/misc/handler.cron1",
        environment: { topicArn: event.snsTopic.topicArn },
      },
    });
    cron.attachPermissions([ event ]);

    const cron2 = new sst.Scheduler(this, "Scheduler2", {
      schedule: 'rate(1 minute)',
      job: {
        handler: "services/misc/handler.cron2",
        environment: { queueUrl: queue.sqsQueue.queueUrl },
      },
    });
    cron2.attachPermissions([ queue ]);
  }
}
