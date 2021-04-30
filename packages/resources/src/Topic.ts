import * as cdk from "@aws-cdk/core";
import * as sns from "@aws-cdk/aws-sns";
import * as snsSubscriptions from "@aws-cdk/aws-sns-subscriptions";
import { App } from "./App";
import { Function as Fn, FunctionProps, FunctionDefinition } from "./Function";
import { Permissions } from "./util/permission";

/////////////////////
// Interfaces
/////////////////////

export interface TopicProps {
  readonly snsTopic?: sns.ITopic | sns.TopicProps;
  readonly subscribers?: (FunctionDefinition | TopicSubscriberProps)[];
  readonly defaultFunctionProps?: FunctionProps;
}

export interface TopicSubscriberProps {
  readonly function: FunctionDefinition;
  readonly subscriberProps?: snsSubscriptions.LambdaSubscriptionProps;
}

/////////////////////
// Construct
/////////////////////

export class Topic extends cdk.Construct {
  public readonly snsTopic: sns.Topic;
  public readonly subscriberFunctions: Fn[];
  private readonly permissionsAttachedForAllSubscribers: Permissions[];
  private readonly defaultFunctionProps?: FunctionProps;

  constructor(scope: cdk.Construct, id: string, props?: TopicProps) {
    super(scope, id);

    const root = scope.node.root as App;
    const {
      snsTopic,
      subscribers,
      defaultFunctionProps,
    } = props || {};
    this.subscriberFunctions = [];
    this.permissionsAttachedForAllSubscribers = [];
    this.defaultFunctionProps = defaultFunctionProps;

    ////////////////////
    // Create Topic
    ////////////////////

    if (cdk.Construct.isConstruct(snsTopic)) {
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

  public addSubscribers(
    scope: cdk.Construct,
    subscribers: (FunctionDefinition | TopicSubscriberProps)[]
  ): void {
    subscribers.forEach((subscriber) => this.addSubscriber(scope, subscriber));
  }

  public attachPermissions(permissions: Permissions): void {
    this.subscriberFunctions.forEach((subscriber) =>
      subscriber.attachPermissions(permissions)
    );
    this.permissionsAttachedForAllSubscribers.push(permissions);
  }

  public attachPermissionsToSubscriber(index: number, permissions: Permissions): void {
    this.subscriberFunctions[index].attachPermissions(permissions);
  }

  public get snsSubscriptions(): sns.Subscription[] {
    return this.subscriberFunctions.map(fn =>
      fn.node.findChild(this.snsTopic.node.id) as sns.Subscription
    );
  }

  private addSubscriber(
    scope: cdk.Construct,
    subscriber: FunctionDefinition | TopicSubscriberProps
  ): Fn {
    // Parse subscriber props
    let subscriberProps;
    let functionDefinition;
    if ((subscriber as TopicSubscriberProps).function !== undefined) {
      subscriber = subscriber as TopicSubscriberProps;
      subscriberProps = subscriber.subscriberProps;
      functionDefinition = subscriber.function;
    }
    else {
      subscriber = subscriber as FunctionDefinition;
      functionDefinition = subscriber;
    }

    // Create function
    const i = this.subscriberFunctions.length;
    const fn = Fn.fromDefinition(
      scope,
      `Subscriber_${i}`,
      functionDefinition,
      this.defaultFunctionProps,
      `The "defaultFunctionProps" cannot be applied if an instance of a Function construct is passed in. Make sure to define all the routes using FunctionProps, so the Api construct can apply the "defaultFunctionProps" to them.`
    );
    this.subscriberFunctions.push(fn);

    // Create Subscription
    this.snsTopic.addSubscription(
      new snsSubscriptions.LambdaSubscription(fn, subscriberProps)
    );

    // Attach existing permissions
    this.permissionsAttachedForAllSubscribers.forEach((permissions) =>
      fn.attachPermissions(permissions)
    );

    return fn;
  }
}
