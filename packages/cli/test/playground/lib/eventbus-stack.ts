import * as events from "@aws-cdk/aws-events";
import * as sst from "@serverless-stack/resources";

export class MainStack extends sst.Stack {
  constructor(scope: sst.App, id: string, props?: sst.StackProps) {
    super(scope, id, props);

    const queue = new sst.Queue(this, "Queue", {
      consumer: "src/lambda.main",
    });

    const iBusArn = "arn:aws:events:us-east-1:112245769880:event-bus/default";
    const bus = new sst.EventBus(this, "EventBus", {
      eventBridgeEventBus: events.EventBus.fromEventBusArn(
        this,
        "IBus",
        iBusArn
      ),
      defaultFunctionProps: {
        timeout: 10,
      },
      rules: {
        s3Rule: {
          eventPattern: { source: ["aws.codebuild"] },
          targets: ["src/lambda.main", queue],
        },
      },
    });

    this.addOutputs({
      BusArn: bus.eventBusArn,
      BusName: bus.eventBusName,
    });
  }
}
