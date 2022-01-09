import { Construct } from 'constructs';
import * as sns from "aws-cdk-lib/aws-sns";
import * as snsSubscriptions from "aws-cdk-lib/aws-sns-subscriptions";
import { App } from "./App";
import { getFunctionRef, SSTConstruct, isCDKConstruct, isCDKConstructOf } from "./Construct";
import { Function as Fn, FunctionProps, FunctionDefinition } from "./Function";
import { Queue } from "./Queue";
import { Permissions } from "./util/permission";

/////////////////////
// Interfaces
/////////////////////

export interface TopicProps {
  readonly snsTopic?: sns.ITopic | sns.TopicProps;
  readonly subscribers?: (
    | FunctionDefinition
    | TopicFunctionSubscriberProps
    | Queue
    | TopicQueueSubscriberProps
  )[];
  readonly defaultFunctionProps?: FunctionProps;
}

export interface TopicFunctionSubscriberProps {
  readonly function: FunctionDefinition;
  readonly subscriberProps?: snsSubscriptions.LambdaSubscriptionProps;
}

export interface TopicQueueSubscriberProps {
  readonly queue: Queue;
  readonly subscriberProps?: snsSubscriptions.SqsSubscriptionProps;
}

/////////////////////
// Construct
/////////////////////

export class Topic extends Construct implements SSTConstruct {
  public readonly snsTopic: sns.Topic;
  private readonly subscribers: (Fn | Queue)[];
  private readonly permissionsAttachedForAllSubscribers: Permissions[];
  private readonly defaultFunctionProps?: FunctionProps;

  constructor(scope: Construct, id: string, props?: TopicProps) {
    super(scope, id);

    const root = scope.node.root as App;
    const { snsTopic, subscribers, defaultFunctionProps } = props || {};
    this.subscribers = [];
    this.permissionsAttachedForAllSubscribers = [];
    this.defaultFunctionProps = defaultFunctionProps;

    ////////////////////
    // Create Topic
    ////////////////////

    if (isCDKConstruct(snsTopic)) {
      this.snsTopic = snsTopic as sns.Topic;
    } else {
      const snsTopicProps = (snsTopic || {}) as sns.TopicProps;
      this.snsTopic = new sns.Topic(this, "Topic", {
        topicName: root.logicalPrefixedName(id),
        ...snsTopicProps,
      });
    }

    ///////////////////////////
    // Create Subscribers
    ///////////////////////////

    this.addSubscribers(this, subscribers || []);
  }

  public get topicArn(): string {
    return this.snsTopic.topicArn;
  }

  public get topicName(): string {
    return this.snsTopic.topicName;
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
        children = sub.sqsQueue.node.children;
      }
      // look for sns.Subscription inside Function
      else {
        children = sub.node.children;
      }

      const child = children.find((child) => {
        return isCDKConstructOf(child as Construct, "aws-cdk-lib.aws_sns.Subscription");
      });
      return child as sns.Subscription;
    });
  }

  public addSubscribers(
    scope: Construct,
    subscribers: (
      | FunctionDefinition
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
        topicArn: this.snsTopic.topicArn,
        subscribers: this.subscribers.map((s) => getFunctionRef(s)!),
      },
    };
  }

  private addSubscriber(
    scope: Construct,
    subscriber:
      | FunctionDefinition
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
        | FunctionDefinition
        | TopicFunctionSubscriberProps;
      this.addFunctionSubscriber(scope, subscriber);
    }
  }

  private addQueueSubscriber(
    scope: Construct,
    subscriber: Queue | TopicQueueSubscriberProps
  ): void {
    // Parse subscriber props
    let subscriberProps;
    let queue;
    if (subscriber instanceof Queue) {
      subscriber = subscriber as Queue;
      queue = subscriber;
    } else {
      subscriber = subscriber as TopicQueueSubscriberProps;
      subscriberProps = subscriber.subscriberProps;
      queue = subscriber.queue;
    }
    this.subscribers.push(queue);

    // Create Subscription
    this.snsTopic.addSubscription(
      new snsSubscriptions.SqsSubscription(queue.sqsQueue, subscriberProps)
    );
  }

  private addFunctionSubscriber(
    scope: Construct,
    subscriber: FunctionDefinition | TopicFunctionSubscriberProps
  ): void {
    // Parse subscriber props
    let subscriberProps;
    let functionDefinition;
    if ((subscriber as TopicFunctionSubscriberProps).function) {
      subscriber = subscriber as TopicFunctionSubscriberProps;
      subscriberProps = subscriber.subscriberProps;
      functionDefinition = subscriber.function;
    } else {
      subscriber = subscriber as FunctionDefinition;
      functionDefinition = subscriber;
    }

    // Create function
    const i = this.subscribers.length;
    const fn = Fn.fromDefinition(
      scope,
      `Subscriber_${this.node.id}_${i}`,
      functionDefinition,
      this.defaultFunctionProps,
      `The "defaultFunctionProps" cannot be applied if an instance of a Function construct is passed in. Make sure to define all the subscribers using FunctionProps, so the Topic construct can apply the "defaultFunctionProps" to them.`
    );
    this.subscribers.push(fn);

    // Create Subscription
    this.snsTopic.addSubscription(
      new snsSubscriptions.LambdaSubscription(fn, subscriberProps)
    );

    // Attach existing permissions
    this.permissionsAttachedForAllSubscribers.forEach((permissions) =>
      fn.attachPermissions(permissions)
    );
  }
}
