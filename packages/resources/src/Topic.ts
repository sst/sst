import * as cdk from "@aws-cdk/core";
import * as sns from "@aws-cdk/aws-sns";
import * as snsSubscriptions from "@aws-cdk/aws-sns-subscriptions";
import { App } from "./App";
import { Function as Func, FunctionProps, FunctionPermissions } from "./Function";

export interface TopicProps {
  readonly subscribers: (string | FunctionProps)[];
  readonly topicProps?: sns.TopicProps;
}

export class Topic extends cdk.Construct {
  public readonly snsTopic: sns.Topic;
  public readonly subscriberFunctions: Func[];

  constructor(scope: cdk.Construct, id: string, props: TopicProps) {
    super(scope, id);

    const root = scope.node.root as App;
    let {
      // Convenience props
      subscribers,
      // Full functionality props
      topicProps,
    } = props;

    ////////////////////
    // Create Topic
    ////////////////////

    if (topicProps === undefined) {
      topicProps = {};
    }

    this.snsTopic = new sns.Topic(this, "Topic", { ...(topicProps || {}),
      topicName: topicProps.topicName || root.logicalPrefixedName(id),
    });

    ///////////////////////////
    // Create Subscribers
    ///////////////////////////

    if ( ! subscribers || subscribers.length === 0) {
      throw new Error(`No subscribers defined for the "${id}" Topic`);
    }

    this.subscriberFunctions = [];
    subscribers.forEach((subscriber, i) => {
      const functionProps = (typeof subscriber === "string") ? { handler: subscriber } : subscriber;
      const func = new Func(this, `Subscriber_${i}`, functionProps);
      this.snsTopic.addSubscription(new snsSubscriptions.LambdaSubscription(func));
      this.subscriberFunctions.push(func);
    });
  }

  attachPermissions(permissions: FunctionPermissions) {
    this.subscriberFunctions.forEach(subscriber =>
      subscriber.attachPermissions(permissions)
    );
  }

  attachPermissionsToSubscriber(index: number, permissions: FunctionPermissions) {
    this.subscriberFunctions[index].attachPermissions(permissions)
  }
}

