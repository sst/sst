import * as cdk from "aws-cdk-lib";
import * as events from "aws-cdk-lib/aws-events";
import * as sst from "@serverless-stack/resources";

export class MainStack extends sst.Stack {
  constructor(scope: sst.App, id: string, props?: sst.StackProps) {
    super(scope, id, props);

    const queue = new sst.Queue(this, "Queue", {
      consumer: "src/lambda.main",
    });

    // Imported by ARN
    const bus = new sst.EventBus(this, "ImportedByArn", {
      eventBridgeEventBus: events.EventBus.fromEventBusArn(
        this,
        "IBus",
        "arn:aws:events:us-east-1:112245769880:event-bus/default"
      ),
      defaultFunctionProps: {
        timeout: 10,
      },
      rules: {
        rule1: {
          eventPattern: {
            source: ["my.custom.event"],
            detailType: ["a", "b"],
          },
          targets: ["src/lambda.main", queue],
        },
      },
    });

    // Imported by name
    new sst.EventBus(this, "ImportedBusByName", {
      eventBridgeEventBus: events.EventBus.fromEventBusName(
        this,
        "IBusByName",
        "default"
      ),
      rules: {
        rule2: {
          eventPattern: { source: ["aws.codebuild"] },
          targets: ["src/lambda.main", queue],
        },
      },
    });

    // Imported by CFN-imported ARN
    new sst.EventBus(this, "ImportedBusByCfnImportedArn", {
      eventBridgeEventBus: events.EventBus.fromEventBusArn(
        this,
        "IBusByCfnImportedArn",
        cdk.Fn.importValue("PlaygroundEventBusARN").toString()
      ),
      rules: {
        rule3: {
          eventPattern: { source: ["aws.codebuild"] },
          targets: ["src/lambda.main", queue],
        },
      },
    });

    this.addOutputs({
      BusArn: {
        value: bus.eventBusArn,
        exportName: "PlaygroundEventBusARN",
      },
      BusName: bus.eventBusName,
    });
  }
}
