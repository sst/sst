import { Construct } from "constructs";
import * as sns from "aws-cdk-lib/aws-sns";
import * as snsSubscriptions from "aws-cdk-lib/aws-sns-subscriptions";
import { App } from "./App";
import {
  getFunctionRef,
  SSTConstruct,
  isCDKConstruct,
  isCDKConstructOf,
} from "./Construct";
import {
  Function as Fn,
  FunctionProps,
  FunctionInlineDefinition,
  FunctionDefinition,
} from "./Function";
import { Queue } from "./Queue";
import { Permissions } from "./util/permission";

/////////////////////
// Interfaces
/////////////////////

export interface TopicProps {
  defaults?: {
    /**
     * The default function props to be applied to all the Lambda functions in the Topic. If the `function` is specified for a subscriber, these default values are overridden. Except for the `environment`, the `layers`, and the `permissions` properties, that will be merged.
     *
     * @example
     * ### Specifying function props for all the subscribers
     *
     *
     * ```js {3-7}
     * new Topic(this, "Topic", {
     *   defaults: {
     *     function: {
     *       timeout: 20,
     *       environment: { tableName: table.tableName },
     *       permissions: [table],
     *     },
     *   }
     *   subscribers: ["src/subscriber1.main", "src/subscriber2.main"],
     * });
     * ```
     */
    function?: FunctionProps;
  };
  /**
   * A list of subscribers to create for this topic
   *
   * @example
   * ### Configure each subscriber seperately
   *
   * #### Using the full config
   * If you wanted to configure each Lambda function separately, you can pass in the [`TopicFunctionSubscriberProps`](#topicfunctionsubscriberprops).
   *
   * ```js
   * new Topic(this, "Topic", {
   *   subscribers: [{
   *     function: {
   *       srcPath: "src/",
   *       handler: "subscriber1.main",
   *       environment: { tableName: table.tableName },
   *       permissions: [table],
   *     },
   *   }],
   * });
   * ```
   *
   * Note that, you can set the `defaultFunctionProps` while using the `function` per subscriber. The `function` will just override the `defaultFunctionProps`. Except for the `environment`, the `layers`, and the `permissions` properties, that will be merged.
   *
   * ```js
   * new Topic(this, "Topic", {
   *   defaults: {
   *     function: {
   *       timeout: 20,
   *       environment: { tableName: table.tableName },
   *       permissions: [table],
   *     },
   *   }
   *   subscribers: [
   *     {
   *       function: {
   *         handler: "subscriber1.main",
   *         timeout: 10,
   *         environment: { bucketName: bucket.bucketName },
   *         permissions: [bucket],
   *       },
   *     },
   *     "subscriber2.main",
   *   ],
   * });
   * ```
   *
   * So in the above example, the `subscriber1` function doesn't use the `timeout` that is set in the `defaultFunctionProps`. It'll instead use the one that is defined in the function definition (`10 seconds`). And the function will have both the `tableName` and the `bucketName` environment variables set; as well as permissions to both the `table` and the `bucket`.
   *
   * @example
   * ### Configuring Queue subscribers
   *
   * #### Specifying the Queue directly
   *
   * You can directly pass in an instance of the Queue construct.
   *
   * ```js {4}
   * const myQueue = new Queue(this, "MyQueue");
   *
   * new Topic(this, "Topic", {
   *   subscribers: [myQueue],
   * });
   * ```
   *
   * @example
   * ### Creating a FIFO topic
   *
   * ```js {3-5}
   * new Topic(this, "Topic", {
   *   subscribers: ["src/subscriber1.main", "src/subscriber2.main"],
   *   snsTopic: {
   *     fifo: true,
   *   },
   * });
   * ```
   *
   * @example
   * ### Configuring the SNS topic
   *
   * Configure the internally created CDK `Topic` instance.
   *
   * ```js {3-5}
   * new Topic(this, "Topic", {
   *   subscribers: ["src/subscriber1.main", "src/subscriber2.main"],
   *   snsTopic: {
   *     topicName: "my-topic",
   *   },
   * });
   * ```
   */
  subscribers?: (
    | FunctionInlineDefinition
    | TopicFunctionSubscriberProps
    | Queue
    | TopicQueueSubscriberProps
  )[];
  cdk?: {
    /**
     * Override the default settings this construct uses internally to create the topic.
     */
    topic?: sns.ITopic | sns.TopicProps;
  };
}

export interface TopicFunctionSubscriberProps {
  /**
   * Used to create the subscriber function for the topic
   */
  function: FunctionDefinition;
  cdk: {
    /**
     * This allows you to override the default settings this construct uses internally to create the subscriber.
     */
    subscription?: snsSubscriptions.LambdaSubscriptionProps;
  };
}

export interface TopicQueueSubscriberProps {
  /**
   * The queue that'll be added as a subscriber to the topic.
   */
  queue: Queue;
  cdk: {
    /**
     * This allows you to override the default settings this construct uses internally to create the subscriber.
     */
    subscription?: snsSubscriptions.SqsSubscriptionProps;
  };
}

/////////////////////
// Construct
/////////////////////

/**
 * The `Topic` construct is a higher level CDK construct that makes it easy to create a serverless pub/sub service. You can create a topic that has a list of subscribers. And you can publish messages to it from any part of your serverless app.
 *
 * You can have two types of subscribers; Function subscribers (subscribe with a Lambda function) or Queue subscribers (subscribe with a SQS queue).
 *
 * This construct makes it easier to define a topic and its subscribers. It also internally connects the subscribers and topic together.
 *
 * @example
 * ### Using the minimal config
 *
 * ```js
 * import { Topic } from "@serverless-stack/resources";
 *
 * new Topic(this, "Topic", {
 *   subscribers: ["src/subscriber1.main", "src/subscriber2.main"],
 * });
 * ```
 */
export class Topic extends Construct implements SSTConstruct {
  public readonly cdk: {
    /**
     * The internally created CDK `Topic` instance.
     */
    topic: sns.ITopic;
  };
  private subscribers: (Fn | Queue)[];
  private permissionsAttachedForAllSubscribers: Permissions[];
  private props: TopicProps;

  constructor(scope: Construct, id: string, props?: TopicProps) {
    super(scope, id);

    this.props = props || {};
    this.cdk = {} as any;
    this.subscribers = [];
    this.permissionsAttachedForAllSubscribers = [];

    this.createTopic();
    this.addSubscribers(this, props?.subscribers || []);
  }

  /**
   * The ARN of the internally created CDK `Topic` instance.
   */
  public get topicArn(): string {
    return this.cdk.topic.topicArn;
  }

  /**
   * The name of the internally created CDK `Topic` instance.
   */
  public get topicName(): string {
    return this.cdk.topic.topicName;
  }

  /**
   * A list of the internally created function instances for the subscribers.
   */
  public get subscriberFunctions(): Fn[] {
    return this.subscribers.filter(
      (subscriber) => subscriber instanceof Fn
    ) as Fn[];
  }

  public get snsSubscriptions(): sns.Subscription[] {
    return this.subscribers.map((sub) => {
      let children;
      // look for sns.Subscription inside Queue.sqsQueue
      if (sub instanceof Queue) {
        children = sub.cdk.queue.node.children;
      }
      // look for sns.Subscription inside Function
      else {
        children = sub.node.children;
      }

      const child = children.find((child) => {
        return isCDKConstructOf(
          child as Construct,
          "aws-cdk-lib.aws_sns.Subscription"
        );
      });
      return child as sns.Subscription;
    });
  }

  /**
   * Add subscribers to the topic.
   * @example
   * ### Adding Function subscribers
   *
   * Add subscribers after the topic has been created.
   *
   * ```js {5}
   * const topic = new Topic(this, "Topic", {
   *   subscribers: ["src/subscriber1.main", "src/subscriber2.main"],
   * });
   *
   * topic.addSubscribers(this, ["src/subscriber3.main"]);
   * ```
   *
   * ### Lazily adding Function subscribers
   *
   * Create an _empty_ topic and lazily add the subscribers.
   *
   * ```js {3}
   * const topic = new Topic(this, "Topic");
   *
   * topic.addSubscribers(this, ["src/subscriber1.main", "src/subscriber2.main"]);
   * ```
   */
  public addSubscribers(
    scope: Construct,
    subscribers: (
      | FunctionInlineDefinition
      | TopicFunctionSubscriberProps
      | Queue
      | TopicQueueSubscriberProps
    )[]
  ): void {
    subscribers.forEach((subscriber) => this.addSubscriber(scope, subscriber));
  }

  /**
   * Attaches the given list of [permissions](../util/Permissions.md) to all the `subscriberFunctions`. This allows the subscribers to access other AWS resources.
   *
   * Internally calls [`Function.attachPermissions`](Function.md#attachpermissions).
   *
   * @example
   * ### Giving the subscribers some permissions
   *
   * Allow the subscriber functions to access S3.
   *
   * ```js {5}
   * const topic = new Topic(this, "Topic", {
   *   subscribers: ["src/subscriber1.main", "src/subscriber2.main"],
   * });
   *
   * topic.attachPermissions(["s3"]);
   * ```
   */
  public attachPermissions(permissions: Permissions): void {
    this.subscribers
      .filter((subscriber) => subscriber instanceof Fn)
      .forEach((subscriber) => subscriber.attachPermissions(permissions));
    this.permissionsAttachedForAllSubscribers.push(permissions);
  }

  /**
   * @example
   * ### Giving a specific subscriber some permissions
   *
   * Allow the first subscriber function to access S3.
   *
   * ```js {5}
   * const topic = new Topic(this, "Topic", {
   *   subscribers: ["src/subscriber1.main", "src/subscriber2.main"],
   * });
   *
   * topic.attachPermissionsToSubscriber(0, ["s3"]);
   * ```
   */
  public attachPermissionsToSubscriber(
    index: number,
    permissions: Permissions
  ): void {
    const subscriber = this.subscribers[index];
    if (!(subscriber instanceof Fn)) {
      throw new Error(
        `Cannot attach permissions to the "${this.node.id}" Topic subscriber because it's not a Lambda function`
      );
    }
    subscriber.attachPermissions(permissions);
  }

  public getConstructMetadata() {
    return {
      type: "Topic" as const,
      data: {
        topicArn: this.cdk.topic.topicArn,
        subscribers: this.subscribers.map((s) => getFunctionRef(s)!),
      },
    };
  }

  private createTopic() {
    const app = this.node.root as App;
    const { cdk } = this.props;

    if (isCDKConstruct(cdk?.topic)) {
      this.cdk.topic = cdk?.topic as sns.Topic;
    } else {
      const snsTopicProps = (cdk?.topic || {}) as sns.TopicProps;
      this.cdk.topic = new sns.Topic(this, "Topic", {
        topicName: app.logicalPrefixedName(this.node.id),
        ...snsTopicProps,
      });
    }
  }

  private addSubscriber(
    scope: Construct,
    subscriber:
      | FunctionInlineDefinition
      | TopicFunctionSubscriberProps
      | Queue
      | TopicQueueSubscriberProps
  ): void {
    if (
      subscriber instanceof Queue ||
      (subscriber as TopicQueueSubscriberProps).queue
    ) {
      subscriber = subscriber as Queue | TopicQueueSubscriberProps;
      this.addQueueSubscriber(scope, subscriber);
    } else {
      subscriber = subscriber as
        | FunctionInlineDefinition
        | TopicFunctionSubscriberProps;
      this.addFunctionSubscriber(scope, subscriber);
    }
  }

  private addQueueSubscriber(
    scope: Construct,
    subscriber: Queue | TopicQueueSubscriberProps
  ): void {
    // Parse subscriber props
    let subscriptionProps;
    let queue;
    if (subscriber instanceof Queue) {
      subscriber = subscriber as Queue;
      queue = subscriber;
    } else {
      subscriber = subscriber as TopicQueueSubscriberProps;
      subscriptionProps = subscriber.cdk.subscription;
      queue = subscriber.queue;
    }
    this.subscribers.push(queue);

    // Create Subscription
    this.cdk.topic.addSubscription(
      new snsSubscriptions.SqsSubscription(queue.cdk.queue, subscriptionProps)
    );
  }

  private addFunctionSubscriber(
    scope: Construct,
    subscriber: FunctionInlineDefinition | TopicFunctionSubscriberProps
  ): void {
    // Parse subscriber props
    let subscriptionProps;
    let functionDefinition;
    if ((subscriber as TopicFunctionSubscriberProps).function) {
      subscriber = subscriber as TopicFunctionSubscriberProps;
      subscriptionProps = subscriber.cdk.subscription;
      functionDefinition = subscriber.function;
    } else {
      subscriber = subscriber as FunctionInlineDefinition;
      functionDefinition = subscriber;
    }

    // Create function
    const i = this.subscribers.length;
    const fn = Fn.fromDefinition(
      scope,
      `Subscriber_${this.node.id}_${i}`,
      functionDefinition,
      this.props.defaults?.function,
      `The "defaults.function" cannot be applied if an instance of a Function construct is passed in. Make sure to define all the subscribers using FunctionProps, so the Topic construct can apply the "defaults.function" to them.`
    );
    this.subscribers.push(fn);

    // Create Subscription
    this.cdk.topic.addSubscription(
      new snsSubscriptions.LambdaSubscription(fn, subscriptionProps)
    );

    // Attach existing permissions
    this.permissionsAttachedForAllSubscribers.forEach((permissions) =>
      fn.attachPermissions(permissions)
    );
  }
}
