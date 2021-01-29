import * as cdk from "@aws-cdk/core";
import * as sqs from "@aws-cdk/aws-sqs";
import * as lambdaEventSources from "@aws-cdk/aws-lambda-event-sources";
import { App } from "./App";
import { Function as Func, FunctionProps, FunctionPermissions } from "./Function";

export interface QueueProps {
  readonly consumer: string | FunctionProps;
  readonly queueProps?: sqs.QueueProps;
}

export class Queue extends cdk.Construct {
  public readonly sqsQueue: sqs.Queue;
  public readonly consumerFunction: Func;

  constructor(scope: cdk.Construct, id: string, props: QueueProps) {
    super(scope, id);

    const root = scope.node.root as App;
    let {
      // Convenience props
      consumer,
      // Full functionality props
      queueProps,
    } = props;

    ////////////////////
    // Create Queue
    ////////////////////
    if (queueProps === undefined) {
      queueProps = {};
    }

    this.sqsQueue = new sqs.Queue(this, "Queue", { ...(queueProps || {}),
      queueName: queueProps.queueName || root.logicalPrefixedName(id),
    });

    ///////////////////////////
    // Create Consumer
    ///////////////////////////

    if ( ! consumer) {
      throw new Error(`No consumer defined for the "${id}" Queue`);
    }
    const functionProps = (typeof consumer === "string") ? { handler: consumer } : consumer;
    this.consumerFunction = new Func(this, `Consumer`, functionProps);
    this.consumerFunction.addEventSource(new lambdaEventSources.SqsEventSource(this.sqsQueue));
  }

  attachPermissions(permissions: FunctionPermissions) {
    this.consumerFunction.attachPermissions(permissions);
  }
}

