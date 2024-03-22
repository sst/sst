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
     * Transform the SNS Topic resource.
     */
    topic?: Transform<aws.sns.TopicArgs>;
  };
}

export interface SnsTopicSubscribeArgs {
  /**
   * Filter the messages that'll be processed by the `subscriber` function.
   *
   * If any single property in the filter doesn't match
   * an attribute assigned to the message, then the policy rejects the message.
   *
   * :::tip
   * Learn more about [subscription filter policies](https://docs.aws.amazon.com/sns/latest/dg/sns-subscription-filter-policies.html).
   * :::
   *
   * @example
   * For example, if your SNS Topic message contains this in a JSON format.
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
     * Transform the SNS Topic Subscription resource.
     */
    subscription?: Transform<aws.sns.TopicSubscriptionArgs>;
  };
}

/**
 * The `SnsTopic` component lets you add an [Amazon SNS Topic](https://docs.aws.amazon.com/sns/latest/dg/sns-create-topic.html) to your app.
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
   * Subscribes to this SNS Topic.
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
   * Add multiple subscribers.
   *
   * ```js
   * topic
   *   .subscribe("src/subscriber1.handler")
   *   .subscribe("src/subscriber2.handler");
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
    args: SnsTopicSubscribeArgs = {},
  ) {
    const parent = this;
    const parentName = this.constructorName;

    // Build subscriber name
    const id = sanitizeToPascalCase(
      hashStringToPrettyString(JSON.stringify(args.filter ?? {}), 4),
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
      transform(args?.transform?.subscription, {
        topic: this.topic.arn,
        protocol: "lambda",
        endpoint: fn.arn,
        filterPolicy: JSON.stringify(args.filter ?? {}),
      }),
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
