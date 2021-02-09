import * as cdk from "@aws-cdk/core";
import * as sqs from "@aws-cdk/aws-sqs";
import * as lambdaEventSources from "@aws-cdk/aws-lambda-event-sources";
import { App } from "./App";
import { Function as Func, FunctionDefinition } from "./Function";
import { Permissions } from "./util/permission";

export interface QueueProps {
  readonly consumer: FunctionDefinition;
  readonly sqsQueue?: sqs.Queue;
}

export class Queue extends cdk.Construct {
  public readonly sqsQueue: sqs.Queue;
  public readonly consumerFunction: Func;

  constructor(scope: cdk.Construct, id: string, props: QueueProps) {
    super(scope, id);

    const root = scope.node.root as App;
    const {
      // Queue props
      sqsQueue,
      // Function props
      consumer,
    } = props;

    ////////////////////
    // Create Queue
    ////////////////////
    if (!sqsQueue) {
      this.sqsQueue = new sqs.Queue(this, "Queue", {
        queueName: root.logicalPrefixedName(id),
      });
    } else {
      this.sqsQueue = sqsQueue;
    }

    ///////////////////////////
    // Create Consumer
    ///////////////////////////

    if (!consumer) {
      throw new Error(`No consumer defined for the "${id}" Queue`);
    }
    this.consumerFunction = Func.fromDefinition(this, `Consumer`, consumer);
    this.consumerFunction.addEventSource(
      new lambdaEventSources.SqsEventSource(this.sqsQueue)
    );
  }

  attachPermissions(permissions: Permissions): void {
    this.consumerFunction.attachPermissions(permissions);
  }
}
