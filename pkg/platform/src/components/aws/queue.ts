import { ComponentResourceOptions, output } from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import { Component, Transform, transform } from "../component";
import { Link } from "../link";
import type { Input } from "../input";
import { Function, FunctionArgs } from "./function";
import { DurationMinutes, toSeconds } from "../duration";
import { VisibleError } from "../error";

export interface QueueArgs {
  /**
   * FIFO or _first-in-first-out_ queues are designed to guarantee that messages are processed exactly once and in the order that they are sent.
   *
   * :::caution
   * Changing a standard queue to a FIFO queue (or the other way around) will cause the queue to be destroyed and recreated.
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
   * The largest number of records that the `subscriber` function will retrieve from your queue a time. The function will then receives an event with all the retrieved records.
   *
   * Ranges between a maximum of 10 and a minimum of 1.
   *
   * If `maxBatchingWindow` is configured, this value can go up to 10000.
   *
   * @default `10`
   */
  batchSize?: Input<number>;
  /**
   * Filter the records processed by the `subscriber` function.
   *
   * :::tip
   * Learn more about the [filter rule syntax](https://docs.aws.amazon.com/lambda/latest/dg/invocation-eventfiltering.html#filtering-syntax).
   * :::
   *
   * @example
   * For example, if you Queue contains records in this JSON format.
   * ```j
   * {
   *   RecordNumber: 0000,
   *   RequestCode: "AAAA",
   *   TimeStamp: "yyyy-mm-ddThh:mm:ss"
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
   *
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
   * The maximum amount of time to wait and collect records before invoking the `subscriber`.
   *
   * Ranges between a maximum of 300 seconds and a minimum of 0. Where, 0  means the `subscriber` is called right away.
   *
   * @default `"0 seconds"`
   * @example
   * ```js
   * {
   *   maxBatchingWindow: "60 seconds"
   * }
   * ```
   */
  maxBatchingWindow?: Input<DurationMinutes>;
  /**
   * The maximum number of concurrent instances of the `subscriber` function that are
   * invoked by the Amazon SQS event.
   *
   * :::note
   * The default is set to your account's Lambda concurrency limit. This is 1000 for most accounts.
   * :::
   *
   * Ranges between a maximum of 1000 and a minimum of 2.
   *
   * @default `1000`
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
 * #### Make it a FIFO queue
 *
 * ```ts {2}
 * new sst.aws.Queue("MyQueue", {
 *   fifo: true
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
   * The SQS Queue URL.
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
   * Subscribe to this queue.
   *
   * @param subscriber The function that'll be notified.
   * @param args Configure the subscription.
   *
   * @example
   *
   * ```js
   * myQueue.subscribe("src/subscriber.handler");
   * ```
   *
   * Add multiple subscribers.
   *
   * ```js
   * myQueue
   *   .subscribe("src/subscriber1.handler")
   *   .subscribe("src/subscriber2.handler");
   * ```
   *
   * Customize the subscription.
   *
   * ```js
   * myQueue.subscribe("src/subscriber.handler", {
   *   batchSize: 5
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
  public subscribe(
    subscriber: string | FunctionArgs,
    args?: QueueSubscribeArgs,
  ) {
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
