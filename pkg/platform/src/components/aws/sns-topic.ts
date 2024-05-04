import { ComponentResourceOptions, Output, all, output } from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import { Component, Transform, transform } from "../component";
import { Link } from "../link";
import type { Input } from "../input";
import { FunctionArgs } from "./function";
import { hashStringToPrettyString, sanitizeToPascalCase } from "../naming";
import { parseQueueArn, parseTopicArn } from "./helpers/arn";
import { SnsTopicLambdaSubscriber } from "./sns-topic-lambda-subscriber";
import { SnsTopicQueueSubscriber } from "./sns-topic-queue-subscriber";

export interface SnsTopicArgs {
  /**
   * FIFO (First-In-First-Out) topics are designed to provide strict message ordering.
   *
   * :::caution
   * Changing a standard topic to a FIFO topic or the other way around will result in the destruction and recreation of the topic.
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
     * Transform the SNS topic resource.
     */
    topic?: Transform<aws.sns.TopicArgs>;
  };
}

export interface SnsTopicSubscriberArgs {
  /**
   * Filter the messages that'll be processed by the subscriber.
   *
   * If any single property in the filter doesn't match
   * an attribute assigned to the message, then the policy rejects the message.
   *
   * :::tip
   * Learn more about [subscription filter policies](https://docs.aws.amazon.com/sns/latest/dg/sns-subscription-filter-policies.html).
   * :::
   *
   * @example
   * For example, if your SNS topic message contains this in a JSON format.
   * ```js
   * {
   *   store: "example_corp",
   *   event: "order-placed",
   *   customer_interests: [
   *      "soccer",
   *      "rugby",
   *      "hockey"
   *   ],
   *   price_usd: 210.75
   * }
   * ```
   *
   * Then this filter policy accepts the message.
   *
   * ```js
   * {
   *   filter: {
   *     store: ["example_corp"],
   *     event: [{"anything-but": "order_cancelled"}],
   *     customer_interests: [
   *        "rugby",
   *        "football",
   *        "baseball"
   *     ],
   *     price_usd: [{numeric: [">=", 100]}]
   *   }
   * }
   * ```
   */
  filter?: Input<Record<string, any>>;
  /**
   * [Transform](/docs/components#transform) how this subscription creates its underlying
   * resources.
   */
  transform?: {
    /**
     * Transform the SNS topic Subscription resource.
     */
    subscription?: Transform<aws.sns.TopicSubscriptionArgs>;
  };
}

/**
 * The `SnsTopic` component lets you add an [Amazon SNS topic](https://docs.aws.amazon.com/sns/latest/dg/sns-create-topic.html) to your app.
 *
 * :::note
 * The difference between an `SnsTopic` and a `Queue` is that with a topic you can deliver messages to multiple subscribers.
 * :::
 *
 * @example
 *
 * #### Create a topic
 *
 * ```ts
 * const topic = new sst.aws.SnsTopic("MyTopic");
 * ```
 *
 * #### Make it a FIFO topic
 *
 * You can optionally make it a FIFO topic.
 *
 * ```ts {2}
 * new sst.aws.SnsTopic("MyTopic", {
 *   fifo: true
 * });
 * ```
 *
 * #### Add a subscriber
 *
 * ```ts
 * topic.subscribe("src/subscriber.handler");
 * ```
 *
 * #### Link the topic to a resource
 *
 * You can link the topic to other resources, like a function or your Next.js app.
 *
 * ```ts
 * new sst.aws.Nextjs("MyWeb", {
 *   link: [topic]
 * });
 * ```
 *
 * Once linked, you can publish messages to the topic from your function code.
 *
 * ```ts title="app/page.tsx" {1,7}
 * import { Resource } from "sst";
 * import { SNSClient, PublishCommand } from "@aws-sdk/client-sns";
 *
 * const sns = new SNSClient({});
 *
 * await sns.send(new PublishCommand({
 *   TopicArn: Resource.MyTopic.arn,
 *   Message: "Hello from Next.js!"
 * }));
 * ```
 */
export class SnsTopic
  extends Component
  implements Link.Linkable, Link.AWS.Linkable
{
  private constructorName: string;
  private topic: aws.sns.Topic;

  constructor(
    name: string,
    args: SnsTopicArgs = {},
    opts: ComponentResourceOptions = {},
  ) {
    super(__pulumiType, name, args, opts);

    const parent = this;
    const fifo = normalizeFifo();

    const topic = createTopic();

    this.constructorName = name;
    this.topic = topic;

    function normalizeFifo() {
      return output(args.fifo).apply((v) => v ?? false);
    }

    function createTopic() {
      return new aws.sns.Topic(
        `${name}Topic`,
        transform(args.transform?.topic, {
          fifoTopic: fifo,
        }),
        { parent },
      );
    }
  }

  /**
   * The ARN of the SNS topic.
   */
  public get arn() {
    return this.topic.arn;
  }

  /**
   * The name of the SNS topic.
   */
  public get name() {
    return this.topic.name;
  }

  /**
   * The underlying [resources](/docs/components/#nodes) this component creates.
   */
  public get nodes() {
    return {
      /**
       * The Amazon SNS topic.
       */
      topic: this.topic,
    };
  }

  /**
   * Subscribe to this SNS topic.
   *
   * @param subscriber The function that'll be notified.
   * @param args Configure the subscription.
   *
   * @example
   *
   * ```js
   * topic.subscribe("src/subscriber.handler");
   * ```
   *
   * Add a filter to the subscription.
   *
   * ```js
   * topic.subscribe("src/subscriber.handler", {
   *   filter: {
   *     price_usd: [{numeric: [">=", 100]}]
   *   }
   * });
   * ```
   *
   * Customize the subscriber function.
   *
   * ```js
   * topic.subscribe({
   *   handler: "src/subscriber.handler",
   *   timeout: "60 seconds"
   * });
   * ```
   */
  public subscribe(
    subscriber: string | FunctionArgs,
    args: SnsTopicSubscriberArgs = {},
  ) {
    return SnsTopic._subscribeFunction(
      this.constructorName,
      this.arn,
      subscriber,
      args,
    );
  }

  /**
   * Subscribe to an SNS topic that was not created in your app.
   *
   * @param topicArn The ARN of the SNS topic to subscribe to.
   * @param subscriber The function that'll be notified.
   * @param args Configure the subscription.
   *
   * @example
   *
   * For example, let's say you have an existing SNS topic with the following ARN.
   *
   * ```js
   * const topicArn = "arn:aws:sns:us-east-1:123456789012:MyTopic";
   * ```
   *
   * You can subscribe to it by passing in the ARN.
   *
   * ```js
   * sst.aws.SnsTopic.subscribe(topicArn, "src/subscriber.handler");
   * ```
   *
   * Add a filter to the subscription.
   *
   * ```js
   * sst.aws.SnsTopic.subscribe(topicArn, "src/subscriber.handler", {
   *   filter: {
   *     price_usd: [{numeric: [">=", 100]}]
   *   }
   * });
   * ```
   *
   * Customize the subscriber function.
   *
   * ```js
   * sst.aws.SnsTopic.subscribe(topicArn, {
   *   handler: "src/subscriber.handler",
   *   timeout: "60 seconds"
   * });
   * ```
   */
  public static subscribe(
    topicArn: Input<string>,
    subscriber: string | FunctionArgs,
    args?: SnsTopicSubscriberArgs,
  ) {
    const topicName = output(topicArn).apply(
      (topicArn) => parseTopicArn(topicArn).topicName,
    );
    return this._subscribeFunction(topicName, topicArn, subscriber, args);
  }

  private static _subscribeFunction(
    name: Input<string>,
    topicArn: Input<string>,
    subscriber: string | FunctionArgs,
    args: SnsTopicSubscriberArgs = {},
  ) {
    return all([name, subscriber, args]).apply(([name, subscriber, args]) => {
      const prefix = sanitizeToPascalCase(name);
      const suffix = sanitizeToPascalCase(
        hashStringToPrettyString(
          [
            topicArn,
            JSON.stringify(args.filter ?? {}),
            typeof subscriber === "string" ? subscriber : subscriber.handler,
          ].join(""),
          6,
        ),
      );

      return new SnsTopicLambdaSubscriber(`${prefix}Subscriber${suffix}`, {
        topic: { arn: topicArn },
        subscriber,
        ...args,
      });
    });
  }

  /**
   * Subscribe to this SNS topic with an SQS queue.
   *
   * @param queueArn The ARN of the queue that'll be notified.
   * @param args Configure the subscription.
   *
   * @example
   *
   * For example, let's say you have a queue.
   *
   * ```js
   * const queue = sst.aws.Queue("MyQueue");
   * ```
   *
   * You can subscribe to this topic with it.
   *
   * ```js
   * topic.subscribeQueue(queue.arn);
   * ```
   *
   * Add a filter to the subscription.
   *
   * ```js
   * topic.subscribeQueue(queue.arn, {
   *   filter: {
   *     price_usd: [{numeric: [">=", 100]}]
   *   }
   * });
   * ```
   */
  public subscribeQueue(
    queueArn: Input<string>,
    args: SnsTopicSubscriberArgs = {},
  ) {
    return SnsTopic._subscribeQueue(
      this.constructorName,
      this.arn,
      queueArn,
      args,
    );
  }

  /**
   * Subscribe to an existing SNS topic with a previously created SQS queue.
   *
   * @param topicArn The ARN of the SNS topic to subscribe to.
   * @param queueArn The ARN of the queue that'll be notified.
   * @param args Configure the subscription.
   *
   * @example
   *
   * For example, let's say you have an existing SNS topic and SQS queue with the following ARNs.
   *
   * ```js
   * const topicArn = "arn:aws:sns:us-east-1:123456789012:MyTopic";
   * const queueArn = "arn:aws:sqs:us-east-1:123456789012:MyQueue";
   * ```
   *
   * You can subscribe to the topic with the queue.
   *
   * ```js
   * sst.aws.SnsTopic.subscribeQueue(topicArn, queueArn);
   * ```
   *
   * Add a filter to the subscription.
   *
   * ```js
   * sst.aws.SnsTopic.subscribeQueue(topicArn, queueArn, {
   *   filter: {
   *     price_usd: [{numeric: [">=", 100]}]
   *   }
   * });
   * ```
   */
  public static subscribeQueue(
    topicArn: Input<string>,
    queueArn: Input<string>,
    args?: SnsTopicSubscriberArgs,
  ) {
    const topicName = output(topicArn).apply(
      (topicArn) => parseTopicArn(topicArn).topicName,
    );
    return this._subscribeQueue(topicName, topicArn, queueArn, args);
  }

  private static _subscribeQueue(
    name: Input<string>,
    topicArn: Input<string>,
    queueArn: Input<string>,
    args: SnsTopicSubscriberArgs = {},
  ) {
    return all([name, queueArn, args]).apply(([name, queueArn, args]) => {
      const prefix = sanitizeToPascalCase(name);
      const suffix = sanitizeToPascalCase(
        hashStringToPrettyString(
          [topicArn, JSON.stringify(args.filter ?? {}), queueArn].join(""),
          6,
        ),
      );

      return new SnsTopicQueueSubscriber(`${prefix}Subscriber${suffix}`, {
        topic: { arn: topicArn },
        queue: queueArn,
        ...args,
      });
    });
  }

  /** @internal */
  public getSSTLink() {
    return {
      properties: {
        arn: this.arn,
      },
    };
  }

  /** @internal */
  public getSSTAWSPermissions() {
    return [
      {
        actions: ["sns:*"],
        resources: [this.arn],
      },
    ];
  }
}

const __pulumiType = "sst:aws:SnsTopic";
// @ts-expect-error
SnsTopic.__pulumiType = __pulumiType;
