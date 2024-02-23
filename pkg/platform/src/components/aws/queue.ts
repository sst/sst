import { ComponentResourceOptions, output } from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import { Component, Transform, transform } from "../component";
import { Link } from "../link";
import type { Input } from "../input";
import { Function, FunctionDefinition } from "./function";
import { Duration, toSeconds } from "../duration";
import { VisibleError } from "../error";

export interface QueueArgs {
  /**
   * FIFO (First-In-First-Out) queues are designed to guarantee that messages are processed exactly once, in the order that they are sent.
   *
   * :::note
   * Changing a standard queue to a FIFO queue or the other way around will result in the destruction and recreation of the queue.
   * :::
   *
   * @default `false`
   * @example
   * ```js
   * {
   *   fifo: true
   * }
   * ```
   */
  fifo?: Input<boolean>;
  /**
   * [Transform](/docs/components#transform/) how this component creates its underlying
   * resources.
   */
  transform?: {
    /**
     * Transform the SQS Queue resource.
     */
    queue?: Transform<aws.sqs.QueueArgs>;
  };
}

export interface QueueSubscribeArgs {
  /**
   * The largest number of records that AWS Lambda will retrieve from your event
   * source at the time of invoking your function. Your function receives an
   * event with all the retrieved records.
   *
   * Valid Range:
   * - Minimum value of 1.
   * - Maximum value of 10.
   *
   * If `maxBatchingWindow` is configured, this value can go up to 10,000.
   *
   * @default `10`
   */
  batchSize?: Input<number>;
  /**
   * Add filter criteria option.
   * @default No filters
   * @example
   * Suppose your Amazon SQS queue contains messages in the following JSON format.
   * ```js
   * {
   *   RecordNumber: 0000,
   *   TimeStamp: "yyyy-mm-ddThh:mm:ss",
   *   RequestCode: "AAAA"
   * }
   * ```
   *
   * To process only those records where the `RequestCode` is `BBBB`.
   * ```js
   * {
   *   filters: [
   *     {
   *       body: {
   *         RequestCode: ["BBBB"]
   *       }
   *     }
   *   ]
   * }
   * ```
   *
   * And to process only those records where `RecordNumber` greater than `9999`.
   * ```js
   * {
   *   filters: [
   *     {
   *       body: {
   *         RecordNumber: [{ numeric: [ ">", 9999 ] }]
   *       }
   *     }
   *   ]
   * }
   * ```
   */
  filters?: Input<Input<Record<string, any>>[]>;
  /**
   * The maximum amount of time to gather records before invoking the function.
   *
   * Valid Range:
   * - Minimum value of 0 seconds.
   * - Maximum value of 300 seconds.
   *
   * @default `0 seconds`
   * @example
   * ```js
   * {
   *   maxBatchingWindow: "60 seconds"
   * }
   */
  maxBatchingWindow?: Input<Duration>;
  /**
   * The maximum concurrency setting limits the number of concurrent instances
   * of the function that an Amazon SQS event source can invoke.
   *
   * Valid Range:
   * - Minimum value of 2.
   * - Maximum value of 1000.
   * @default If not set, Lambda can scale up to your account's total concurrency quota, which is 1,000 by default.
   */
  maxConcurrency?: Input<number>;
  /**
   * Allow functions to return partially successful responses for a batch of records.
   * @default `false`
   */
  reportBatchItemFailures?: Input<boolean>;
}

/**
 * The `Queue` component lets you add an [AWS SQS Queue](https://aws.amazon.com/sqs/) to
 * your app.
 *
 * @example
 *
 * #### Minimal example
 *
 * ```ts
 * new sst.aws.Queue("MyQueue");
 * ```
 *
 * #### FIFO queue
 *
 * ```ts {2}
 * new sst.aws.Queue("MyQueue", {
 *   fifo: true,
 * });
 * ```
 */
export class Queue
  extends Component
  implements Link.Linkable, Link.AWS.Linkable
{
  private constructorName: string;
  private queue: aws.sqs.Queue;
  private isSubscribed: boolean = false;

  constructor(name: string, args?: QueueArgs, opts?: ComponentResourceOptions) {
    super("sst:aws:Queue", name, args, opts);

    const parent = this;
    const fifo = normalizeFifo();

    const queue = createQueue();

    this.constructorName = name;
    this.queue = queue;

    function normalizeFifo() {
      return output(args?.fifo).apply((v) => v ?? false);
    }

    function createQueue() {
      return new aws.sqs.Queue(
        `${name}Queue`,
        transform(args?.transform?.queue, {
          fifoQueue: fifo,
        }),
        { parent },
      );
    }
  }

  /**
   * The ARN of the SQS Queue.
   */
  public get arn() {
    return this.queue.arn;
  }

  /**
   * The ARN of the SQS Queue.
   */
  public get url() {
    return this.queue.url;
  }

  /**
   * The underlying [resources](/docs/components/#nodes) this component creates.
   */
  public get nodes() {
    return {
      /**
       * The Amazon SQS Queue.
       */
      queue: this.queue,
    };
  }

  /**
   * Subscribes to the SQS Queue.
   * @example
   *
   * ```js
   * subscribe("src/subscriber.handler");
   * ```
   *
   * Customize the subscription.
   * ```js
   * subscribe("src/subscriber.handler", {
   *   batchSize: 5,
   * });
   * ```
   *
   * Customize the subscriber function.
   * ```js
   * subscribe({
   *   handler: "src/subscriber.handler",
   *   timeout: "60 seconds",
   * });
   * ```
   */
  public subscribe(subscriber: FunctionDefinition, args?: QueueSubscribeArgs) {
    const parent = this;
    const parentName = this.constructorName;

    if (this.isSubscribed)
      throw new VisibleError(
        `Cannot subscribe to the "${parentName}" queue multiple times. An AWS SQS queue can only have one subscriber.`,
      );
    this.isSubscribed = true;

    const fn = Function.fromDefinition(
      parent,
      `${parentName}Subscriber`,
      subscriber,
      {
        description: `Subscribed to ${parentName}`,
        permissions: [
          {
            actions: [
              "sqs:ChangeMessageVisibility",
              "sqs:DeleteMessage",
              "sqs:GetQueueAttributes",
              "sqs:GetQueueUrl",
              "sqs:ReceiveMessage",
            ],
            resources: [this.arn],
          },
        ],
      },
    );
    new aws.lambda.EventSourceMapping(
      `${parentName}EventSourceMapping`,
      {
        eventSourceArn: this.arn,
        functionName: fn.name,
        batchSize: args?.batchSize,
        filterCriteria: args?.filters && {
          filters: output(args.filters).apply((filters) =>
            filters.map((filter) => ({
              pattern: JSON.stringify(filter),
            })),
          ),
        },
        maximumBatchingWindowInSeconds:
          args?.maxBatchingWindow &&
          output(args.maxBatchingWindow).apply((v) => toSeconds(v)),
        scalingConfig: {
          maximumConcurrency: args?.maxConcurrency,
        },
        functionResponseTypes: output(args?.reportBatchItemFailures).apply(
          (v) => (v ? ["ReportBatchItemFailures"] : []),
        ),
      },
      { parent },
    );

    return this;
  }

  /** @internal */
  public getSSTLink() {
    return {
      properties: {
        url: this.url,
      },
    };
  }

  /** @internal */
  public getSSTAWSPermissions() {
    return [
      {
        actions: ["sqs:*"],
        resources: [this.arn],
      },
    ];
  }
}
