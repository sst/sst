import { Construct } from 'constructs';
import * as cdk from "aws-cdk-lib";
import * as sqs from "aws-cdk-lib/aws-sqs";
import * as lambdaEventSources from "aws-cdk-lib/aws-lambda-event-sources";
import { App } from "./App";
import { getFunctionRef, SSTConstruct, isCDKConstruct } from "./Construct";
import { Function as Fn, FunctionDefinition } from "./Function";
import { Permissions } from "./util/permission";

export interface QueueProps {
  readonly sqsQueue?: sqs.IQueue | sqs.QueueProps;
  readonly consumer?: FunctionDefinition | QueueConsumerProps;
}

export interface QueueConsumerProps {
  readonly function: FunctionDefinition;
  readonly consumerProps?: lambdaEventSources.SqsEventSourceProps;
}

export class Queue extends Construct implements SSTConstruct {
  public readonly sqsQueue: sqs.Queue;
  public consumerFunction?: Fn;
  private readonly permissionsAttachedForAllConsumers: Permissions[];

  constructor(scope: Construct, id: string, props?: QueueProps) {
    super(scope, id);

    const root = scope.node.root as App;
    const {
      // Queue props
      sqsQueue,
      // Function props
      consumer,
    } = props || {};
    this.permissionsAttachedForAllConsumers = [];

    ////////////////////
    // Create Queue
    ////////////////////
    if (isCDKConstruct(sqsQueue)) {
      this.sqsQueue = sqsQueue as sqs.Queue;
    } else {
      const sqsQueueProps: sqs.QueueProps = sqsQueue || {};

      // If debugIncreaseTimeout is enabled (ie. sst start):
      // - Set visibilityTimeout to > 900s. This is because Lambda timeout is
      //   set to 900s, and visibilityTimeout has to be greater or equal to it.
      //   This will give people more time to debug the function without timing
      //   out the request.
      let debugOverrideProps;
      if (root.debugIncreaseTimeout) {
        if (
          !sqsQueueProps.visibilityTimeout ||
          sqsQueueProps.visibilityTimeout.toSeconds() < 900
        ) {
          debugOverrideProps = {
            visibilityTimeout: cdk.Duration.seconds(900),
          };
        }
      }

      const name =
        root.logicalPrefixedName(id) + (sqsQueueProps.fifo ? ".fifo" : "");
      this.sqsQueue = new sqs.Queue(this, "Queue", {
        queueName: name,
        ...sqsQueueProps,
        ...(debugOverrideProps || {}),
      });
    }

    ///////////////////////////
    // Create Consumer
    ///////////////////////////
    if (consumer) {
      this.addConsumer(this, consumer);
    }
  }

  public addConsumer(
    scope: Construct,
    consumer: FunctionDefinition | QueueConsumerProps
  ): void {
    if (this.consumerFunction) {
      throw new Error("Cannot configure more than 1 consumer for a Queue");
    }

    // Parse consumer props
    let consumerProps;
    let functionDefinition;
    if ((consumer as QueueConsumerProps).function) {
      consumer = consumer as QueueConsumerProps;
      consumerProps = consumer.consumerProps;
      functionDefinition = consumer.function;
    } else {
      consumer = consumer as FunctionDefinition;
      functionDefinition = consumer;
    }

    // Create function
    this.consumerFunction = Fn.fromDefinition(
      scope,
      `Consumer_${this.node.id}`,
      functionDefinition
    );
    this.consumerFunction.addEventSource(
      new lambdaEventSources.SqsEventSource(this.sqsQueue, consumerProps)
    );

    // Attach permissions
    this.permissionsAttachedForAllConsumers.forEach((permissions) => {
      if (this.consumerFunction) {
        this.consumerFunction.attachPermissions(permissions);
      }
    });
  }

  public attachPermissions(permissions: Permissions): void {
    if (this.consumerFunction) {
      this.consumerFunction.attachPermissions(permissions);
    }

    this.permissionsAttachedForAllConsumers.push(permissions);
  }

  public getConstructMetadata() {
    return {
      type: "Queue" as const,
      data: {
        name: this.sqsQueue.queueName,
        url: this.sqsQueue.queueUrl,
        consumer: getFunctionRef(this.consumerFunction),
      },
    };
  }
}
