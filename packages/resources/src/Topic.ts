import * as cdk from "@aws-cdk/core";
import * as sns from "@aws-cdk/aws-sns";
import * as snsSubscriptions from "@aws-cdk/aws-sns-subscriptions";
import { App } from "./App";
import { Function as Fn, FunctionDefinition } from "./Function";
import { Permissions } from "./util/permission";

/////////////////////
// Interfaces
/////////////////////

export interface TopicProps {
  readonly snsTopic?: sns.ITopic | sns.TopicProps;
  readonly subscribers?: (FunctionDefinition | TopicSubscriberProps)[];
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

  constructor(scope: cdk.Construct, id: string, props?: TopicProps) {
    super(scope, id);

    const root = scope.node.root as App;
    const {
      // Topic props
      snsTopic,
      // Function props
      subscribers,
    } = props || {};
    this.subscriberFunctions = [];
    this.permissionsAttachedForAllSubscribers = [];

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

  addSubscriber(
    scope: cdk.Construct,
    subscriber: FunctionDefinition | TopicSubscriberProps
  ): Fn {
    let fn;
    const i = this.subscriberFunctions.length;

    // subscriber is props
    if ((subscriber as TopicSubscriberProps).function) {
      subscriber = subscriber as TopicSubscriberProps;

      fn = Fn.fromDefinition(scope, `Subscriber_${i}`, subscriber.function);
      this.snsTopic.addSubscription(
        new snsSubscriptions.LambdaSubscription(fn, subscriber.subscriberProps)
      );
      this.subscriberFunctions.push(fn);
    }
    // subscriber is function
    else {
      subscriber = subscriber as FunctionDefinition;

      fn = Fn.fromDefinition(scope, `Subscriber_${i}`, subscriber);
      this.snsTopic.addSubscription(
        new snsSubscriptions.LambdaSubscription(fn)
      );
      this.subscriberFunctions.push(fn);
    }

    return fn;
  }

  addSubscribers(
    scope: cdk.Construct,
    subscribers: (FunctionDefinition | TopicSubscriberProps)[]
  ): void {
    subscribers.forEach((subscriber) => {
      // add subscriber
      const fn = this.addSubscriber(scope, subscriber);

      // attached existing permissions
      this.permissionsAttachedForAllSubscribers.forEach((permissions) =>
        fn.attachPermissions(permissions)
      );
    });
  }

  attachPermissions(permissions: Permissions): void {
    this.subscriberFunctions.forEach((subscriber) =>
      subscriber.attachPermissions(permissions)
    );
    this.permissionsAttachedForAllSubscribers.push(permissions);
  }

  attachPermissionsToSubscriber(index: number, permissions: Permissions): void {
    this.subscriberFunctions[index].attachPermissions(permissions);
  }
}
