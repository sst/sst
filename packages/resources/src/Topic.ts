import { Construct } from "constructs";
import * as sns from "aws-cdk-lib/aws-sns";
import * as snsSubscriptions from "aws-cdk-lib/aws-sns-subscriptions";
import { App } from "./App.js";
import {
  getFunctionRef,
  SSTConstruct,
  isCDKConstruct,
  isCDKConstructOf,
} from "./Construct.js";
import {
  Function as Fn,
  FunctionProps,
  FunctionInlineDefinition,
  FunctionDefinition,
} from "./Function.js";
import { Queue } from "./Queue.js";
import { Permissions } from "./util/permission.js";

/////////////////////
// Interfaces
/////////////////////

/**
 * Used to define a queue subscriber for a topic
 *
 * @example
 * ```js
 * new Topic(stack, "Topic", {
 *   subscribers: {
 *     subscriber: {
 *       type: "queue",
 *       queue: new Queue(stack, "Queue", {
 *         consumer: "src/function.handler"
 *       })
 *     }
 *   }
 * })
 * ```
 */
export interface TopicQueueSubscriberProps {
  /**
   * String literal to signify that the subscriber is a queue
   */
  type: "queue";
  /**
   * The queue that'll be added as a subscriber to the topic.
   */
  queue: Queue;
  cdk?: {
    /**
     * This allows you to override the default settings this construct uses internally to create the subscriber.
     */
    subscription?: snsSubscriptions.SqsSubscriptionProps;
  };
}

/**
 * Used to define a function subscriber for a topic
 *
 * @example
 * ```js
 * new Topic(stack, "Topic", {
 *   subscribers: {
 *     subscriber: "src/function.handler"
 *   }
 * })
 * ```
 */
export interface TopicFunctionSubscriberProps {
  /**
   * String literal to signify that the subscriber is a function
   */
  type?: "function";
  /**
   * Used to create the subscriber function for the topic
   */
  function: FunctionDefinition;
  cdk?: {
    /**
     * This allows you to override the default settings this construct uses internally to create the subscriber.
     */
    subscription?: snsSubscriptions.LambdaSubscriptionProps;
  };
}

export interface TopicProps {
  defaults?: {
    /**
     * The default function props to be applied to all the consumers in the Topic. The `environment`, `permissions` and `layers` properties will be merged with per route definitions if they are defined.
     *
     * @example
     *
     * ```js
     * new Topic(stack, "Topic", {
     *   defaults: {
     *     function: {
     *       timeout: 20,
     *     }
     *   },
     * });
     * ```
     */
    function?: FunctionProps;
  };
  /**
   * Configure subscribers for this topic
   *
   * @example
   * ```js
   * new Topic(stack, "Topic", {
   *   subscribers: {
   *     subscriber1: "src/function1.handler",
   *     subscriber2: "src/function2.handler"
   *   },
   * });
   * ```
   */
  subscribers?: Record<
    string,
    | FunctionInlineDefinition
    | TopicFunctionSubscriberProps
    | Queue
    | TopicQueueSubscriberProps
  >;
  cdk?: {
    /**
     * Override the default settings this construct uses internally to create the topic.
     */
    topic?: sns.ITopic | sns.TopicProps;
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
 * new Topic(stack, "Topic", {
 *   subscribers: {
 *     subscriber1: "src/function1.handler",
 *     subscriber2: "src/function2.handler"
 *   },
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
  private subscribers: Record<string, Fn | Queue>;
  private permissionsAttachedForAllSubscribers: Permissions[];
  private props: TopicProps;

  constructor(scope: Construct, id: string, props?: TopicProps) {
    super(scope, id);

    this.props = props || {};
    this.cdk = {} as any;
    this.subscribers = {};
    this.permissionsAttachedForAllSubscribers = [];

    this.createTopic();
    this.addSubscribers(this, props?.subscribers || {});
  }

  /**
   * The ARN of the internally created SNS Topic.
   */
  public get topicArn(): string {
    return this.cdk.topic.topicArn;
  }

  /**
   * The name of the internally created SNS Topic.
   */
  public get topicName(): string {
    return this.cdk.topic.topicName;
  }

  /**
   * Get a list of subscriptions for this topic
   */
  public get subscriptions(): sns.Subscription[] {
    return Object.values(this.subscribers).map((sub) => {
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
   * A list of the internally created function instances for the subscribers.
   */
  public get subscriberFunctions(): Fn[] {
    return Object.values(this.subscribers).filter(
      (subscriber) => subscriber instanceof Fn
    ) as Fn[];
  }

  /**
   * Add subscribers to the topic.
   *
   * @example
   * ```js {5}
   * const topic = new Topic(stack, "Topic", {
   *   subscribers: {
   *     subscriber1: "src/function1.handler",
   *     subscriber2: "src/function2.handler"
   *   },
   * });
   * topic.addSubscribers(stack, {
   *   subscriber3: "src/function3.handler"
   * });
   * ```
   */
  public addSubscribers(
    scope: Construct,
    subscribers: {
      [subscriberName: string]:
        | FunctionInlineDefinition
        | TopicFunctionSubscriberProps
        | Queue
        | TopicQueueSubscriberProps;
    }
  ): void {
    Object.entries(subscribers).forEach(([subscriberName, subscriber]) => {
      this.addSubscriber(scope, subscriberName, subscriber);
    });
  }

  /**
   * Attaches the given list of permissions to all the subscriber functions. This allows the subscribers to access other AWS resources.
   *
   * @example
   *
   * ```js
   * const topic = new Topic(stack, "Topic", {
   *   subscribers: {
   *     subscriber1: "src/function1.handler",
   *     subscriber2: "src/function2.handler"
   *   },
   * });
   * topic.attachPermissions(["s3"]);
   * ```
   */
  public attachPermissions(permissions: Permissions): void {
    Object.values(this.subscribers)
      .filter((subscriber) => subscriber instanceof Fn)
      .forEach((subscriber) => subscriber.attachPermissions(permissions));
    this.permissionsAttachedForAllSubscribers.push(permissions);
  }

  /**
   * Attaches the list of permissions to a given subscriber by index
   * @example
   * ```js {5}
   * const topic = new Topic(stack, "Topic", {
   *   subscribers: {
   *     subscriber1: "src/function1.handler",
   *     subscriber2: "src/function2.handler"
   *   },
   * });
   *
   * topic.attachPermissionsToSubscriber("subscriber1", ["s3"]);
   * ```
   */
  public attachPermissionsToSubscriber(
    subscriberName: string,
    permissions: Permissions
  ): void {
    const subscriber = this.subscribers[subscriberName];
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
        // TODO: Deprecate eventually and mirror KinesisStream
        subscribers: Object.values(this.subscribers).map(getFunctionRef),
        subscriberNames: Object.keys(this.subscribers),
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
    subscriberName: string,
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
      this.addQueueSubscriber(scope, subscriberName, subscriber);
    } else {
      subscriber = subscriber as
        | FunctionInlineDefinition
        | TopicFunctionSubscriberProps;
      this.addFunctionSubscriber(scope, subscriberName, subscriber);
    }
  }

  private addQueueSubscriber(
    scope: Construct,
    subscriberName: string,
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
      subscriptionProps = subscriber.cdk?.subscription;
      queue = subscriber.queue;
    }
    this.subscribers[subscriberName] = queue;

    // Create Subscription
    this.cdk.topic.addSubscription(
      new snsSubscriptions.SqsSubscription(queue.cdk.queue, subscriptionProps)
    );
  }

  private addFunctionSubscriber(
    scope: Construct,
    subscriberName: string,
    subscriber: FunctionInlineDefinition | TopicFunctionSubscriberProps
  ): void {
    // Parse subscriber props
    let subscriptionProps;
    let functionDefinition;
    if (typeof subscriber !== "string" && "function" in subscriber) {
      subscriptionProps = subscriber.cdk?.subscription;
      functionDefinition = subscriber.function;
    } else {
      subscriber = subscriber as FunctionInlineDefinition;
      functionDefinition = subscriber;
    }

    // Create function
    const fn = Fn.fromDefinition(
      scope,
      `Subscriber_${this.node.id}_${subscriberName}`,
      functionDefinition,
      this.props.defaults?.function,
      `The "defaults.function" cannot be applied if an instance of a Function construct is passed in. Make sure to define all the subscribers using FunctionProps, so the Topic construct can apply the "defaults.function" to them.`
    );
    this.subscribers[subscriberName] = fn;

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
