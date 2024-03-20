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
   * [Transform](/docs/components#transform) how this component creates its underlying
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
   * Filter the records that'll be processed by the `subscriber` function.
   *
   * :::tip
   * You can pass in up to 5 different filters.
   * :::
   *
   * You can pass in up to 5 different filter policies. These will logically ORed together. Meaning that if any single policy matches, the record will be processed. Learn more about the [filter rule syntax](https://docs.aws.amazon.com/lambda/latest/dg/invocation-eventfiltering.html#filtering-syntax).
   *
   * @example
   * For example, if you Queue contains records in this JSON format.
   * ```js
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
   * [Transform](/docs/components#transform) how this component creates its underlying
   * resources.
   */
  transform?: {
    /**
     * Transform the Lambda Event Source Mapping resource.
     */
    eventSourceMapping?: Transform<aws.lambda.EventSourceMappingArgs>;
  };
}

/**
 * The `Queue` component lets you add a serverless queue to your app. It uses [Amazon SQS](https://aws.amazon.com/sqs/).
 *
 * @example
 *
 * #### Create a queue
 *
 * ```ts
 * const queue = new sst.aws.Queue("MyQueue");
 * ```
 *
 * #### Make it a FIFO queue
 *
 * You can optionally make it a FIFO queue.
 *
 * ```ts {2}
 * new sst.aws.Queue("MyQueue", {
 *   fifo: true
 * });
 * ```
 *
 * #### Add a subscriber
 *
 * ```ts
 * queue.subscribe("src/subscriber.handler");
 * ```
 *
 * #### Link the queue to a resource
 *
 * You can link the queue to other resources, like a function or your Next.js app.
 *
 * ```ts
 * new sst.aws.Nextjs("MyWeb", {
 *   link: [queue]
 * });
 * ```
 *
 * Once linked, you can send messages to the queue from your function code.
 *
 * ```ts title="app/page.tsx" {1,7}
 * import { Resource } from "sst";
 * import { SQSClient, SendMessageCommand } from "@aws-sdk/client-sqs";
 *
 * const sqs = new SQSClient({});
 *
 * await sqs.send(new SendMessageCommand({
 *   QueueUrl: Resource.MyQueue.url,
 *   MessageBody: "Hello from Next.js!"
 * }));
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
   * queue.subscribe("src/subscriber.handler");
   * ```
   *
   * Add multiple subscribers.
   *
   * ```js
   * queue
   *   .subscribe("src/subscriber1.handler")
   *   .subscribe("src/subscriber2.handler");
   * ```
   *
   * Add a filter to the subscription.
   *
   * ```js
   * queue.subscribe("src/subscriber.handler", {
   *   filters: [
   *     {
   *       body: {
   *         RequestCode: ["BBBB"]
   *       }
   *     }
   *   ]
   * });
   * ```
   *
   * Customize the subscriber function.
   *
   * ```js
   * queue.subscribe({
   *   handler: "src/subscriber.handler",
   *   timeout: "60 seconds"
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
      transform(args?.transform?.eventSourceMapping, {
        eventSourceArn: this.arn,
        functionName: fn.name,
        filterCriteria: args?.filters && {
          filters: output(args.filters).apply((filters) =>
            filters.map((filter) => ({
              pattern: JSON.stringify(filter),
            })),
          ),
        },
      }),
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
