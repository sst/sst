import { Construct } from "constructs";
import * as sqs from "aws-cdk-lib/aws-sqs";
import * as lambdaEventSources from "aws-cdk-lib/aws-lambda-event-sources";
import { App } from "./App";
import { getFunctionRef, SSTConstruct, isCDKConstruct } from "./Construct";
import {
  Function as Fn,
  FunctionInlineDefinition,
  FunctionDefinition,
} from "./Function";
import { toCdkDuration } from "./util/duration";
import { Permissions } from "./util/permission";

export interface QueueProps {
  cdk?: {
    queue?: sqs.IQueue | sqs.QueueProps;
  };
  consumer?: FunctionInlineDefinition | QueueConsumerProps;
}

export interface QueueConsumerProps {
  function: FunctionDefinition;
  cdk?: {
    eventSource?: lambdaEventSources.SqsEventSourceProps;
  };
}

/////////////////////
// Construct
/////////////////////

export class Queue extends Construct implements SSTConstruct {
  public readonly cdk: {
    queue: sqs.IQueue;
  };
  public consumerFunction?: Fn;
  private permissionsAttachedForAllConsumers: Permissions[];
  private props: QueueProps;

  constructor(scope: Construct, id: string, props?: QueueProps) {
    super(scope, id);

    this.props = props || {};
    this.cdk = {} as any;
    this.permissionsAttachedForAllConsumers = [];

    this.createQueue();

    if (props?.consumer) {
      this.addConsumer(this, props.consumer);
    }
  }

  public addConsumer(
    scope: Construct,
    consumer: FunctionInlineDefinition | QueueConsumerProps
  ): void {
    if (this.consumerFunction) {
      throw new Error("Cannot configure more than 1 consumer for a Queue");
    }

    // Parse consumer props
    let eventSourceProps;
    let functionDefinition;
    if ((consumer as QueueConsumerProps).function) {
      consumer = consumer as QueueConsumerProps;
      eventSourceProps = consumer.cdk?.eventSource;
      functionDefinition = consumer.function;
    } else {
      consumer = consumer as FunctionInlineDefinition;
      functionDefinition = consumer;
    }

    // Create function
    this.consumerFunction = Fn.fromDefinition(
      scope,
      `Consumer_${this.node.id}`,
      functionDefinition
    );
    this.consumerFunction.addEventSource(
      new lambdaEventSources.SqsEventSource(this.cdk.queue, eventSourceProps)
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
        name: this.cdk.queue.queueName,
        url: this.cdk.queue.queueUrl,
        consumer: getFunctionRef(this.consumerFunction),
      },
    };
  }

  private createQueue() {
    const { cdk } = this.props;
    const root = this.node.root as App;
    const id = this.node.id;

    if (isCDKConstruct(cdk?.queue)) {
      this.cdk.queue = cdk?.queue as sqs.Queue;
    } else {
      const sqsQueueProps: sqs.QueueProps = cdk?.queue || {};

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
          // TODO
          console.log(toCdkDuration("900 seconds"));
          debugOverrideProps = {
            visibilityTimeout: toCdkDuration("900 seconds"),
          };
        }
      }

      const name =
        root.logicalPrefixedName(id) + (sqsQueueProps.fifo ? ".fifo" : "");
      this.cdk.queue = new sqs.Queue(this, "Queue", {
        queueName: name,
        ...sqsQueueProps,
        ...debugOverrideProps,
      });
    }
  }
}
