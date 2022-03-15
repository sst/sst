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
    functionProps?: FunctionProps;
  };
  subscribers?: (
    | FunctionInlineDefinition
    | TopicFunctionSubscriberProps
    | Queue
    | TopicQueueSubscriberProps
  )[];
  cdk?: {
    topic?: sns.ITopic | sns.TopicProps;
  };
}

export interface TopicFunctionSubscriberProps {
  function: FunctionDefinition;
  cdk: {
    subscriptionProps?: snsSubscriptions.LambdaSubscriptionProps;
  };
}

export interface TopicQueueSubscriberProps {
  queue: Queue;
  cdk: {
    subscriptionProps?: snsSubscriptions.SqsSubscriptionProps;
  };
}

/////////////////////
// Construct
/////////////////////

export class Topic extends Construct implements SSTConstruct {
  public readonly cdk: {
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

  public get topicArn(): string {
    return this.cdk.topic.topicArn;
  }

  public get topicName(): string {
    return this.cdk.topic.topicName;
  }

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

  public attachPermissions(permissions: Permissions): void {
    this.subscribers
      .filter((subscriber) => subscriber instanceof Fn)
      .forEach((subscriber) => subscriber.attachPermissions(permissions));
    this.permissionsAttachedForAllSubscribers.push(permissions);
  }

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
      subscriptionProps = subscriber.cdk.subscriptionProps;
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
      subscriptionProps = subscriber.cdk.subscriptionProps;
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
      this.props.defaults?.functionProps,
      `The "defaults.functionProps" cannot be applied if an instance of a Function construct is passed in. Make sure to define all the subscribers using FunctionProps, so the Topic construct can apply the "defaults.functionProps" to them.`
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
