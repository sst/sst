import { ComponentResourceOptions, output } from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import { Component, Transform, transform } from "../component";
import { Link } from "../link";
import type { Input } from "../input";
import { Function, FunctionArgs } from "./function";
import { hashStringToPrettyString, sanitizeToPascalCase } from "../naming";

export interface SnsTopicArgs {
  /**
   * FIFO (First-In-First-Out) topics are designed to provide strict message ordering.
   *
   * :::note
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
   * [Transform](/docs/components#transform/) how this component creates its underlying
   * resources.
   */
  transform?: {
    /**
     * Transform the SNS Topic resource.
     */
    topic?: Transform<aws.sns.TopicArgs>;
    /**
     * Transform the SNS Topic subscription resource.
     */
    subscription?: Transform<aws.sns.TopicSubscriptionArgs>;
  };
}

export interface SnsTopicSubscribeArgs {
  /**
   * Add filter criteria option. If any single property in this filter doesn't match
   * an attribute assigned to the message, the policy rejects the message.
   * @default No filters
   * @example
   * Suppose your Amazon SNS topic message contains attributes in the following JSON format.
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
   * This policy accepts the example message.
   * ```js
   * {
   *    store: ["example_corp"],
   *    event: [{"anything-but": "order_cancelled"}],
   *    customer_interests: [
   *       "rugby",
   *       "football",
   *       "baseball"
   *    ],
   *    price_usd: [{numeric: [">=", 100]}]
   * }
   * ```
   *
   * And this policy rejects the example message, because the encrypted property name
   * isn't present in the message attributes.
   * ```js
   * {
   *    store: ["example_corp"],
   *    event: ["order_cancelled"],
   *    encrypted: [false],
   *    customer_interests: [
   *       "basketball",
   *       "baseball"
   *    ]
   * }
   * ```
   */
  filters?: Input<Record<string, any>>;
}

/**
 * The `SnsTopic` component lets you add an [AWS SNS Topic](https://aws.amazon.com/sns/) to
 * your app.
 *
 * @example
 *
 * #### Minimal example
 *
 * ```ts
 * new sst.aws.SnsTopic("MyTopic");
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
    super("sst:aws:SnsTopic", name, args, opts);

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
   * The ARN of the SNS Topic.
   */
  public get arn() {
    return this.topic.arn;
  }

  /**
   * The name of the SNS Topic.
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
       * The Amazon SNS Topic.
       */
      topic: this.topic,
    };
  }

  /**
   * Subscribes to the SNS Topic.
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
  public subscribe(
    subscriber: string | FunctionArgs,
    args: SnsTopicSubscribeArgs = {},
  ) {
    const parent = this;
    const parentName = this.constructorName;

    // Build subscriber name
    const id = sanitizeToPascalCase(
      hashStringToPrettyString(JSON.stringify(args.filters ?? {}), 4),
    );

    const fn = Function.fromDefinition(
      parent,
      `${parentName}Subscriber${id}`,
      subscriber,
      {
        description: `Subscribed to ${parentName}`,
      },
    );
    const permission = new aws.lambda.Permission(
      `${parentName}Subscriber${id}Permissions`,
      {
        action: "lambda:InvokeFunction",
        function: fn.arn,
        principal: "sns.amazonaws.com",
        sourceArn: this.arn,
      },
      { parent },
    );
    new aws.sns.TopicSubscription(
      `${parentName}Subscription${id}`,
      {
        topic: this.topic.arn,
        protocol: "lambda",
        endpoint: fn.arn,
        filterPolicy: JSON.stringify(args.filters ?? {}),
      },
      { parent, dependsOn: [permission] },
    );

    return this;
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
