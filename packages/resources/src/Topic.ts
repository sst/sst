import * as cdk from "@aws-cdk/core";
import * as sns from "@aws-cdk/aws-sns";
import * as snsSubscriptions from "@aws-cdk/aws-sns-subscriptions";
import { App } from "./App";
import { Function as Func, FunctionDefinition, FunctionPermissions } from "./Function";

export interface TopicProps {
  readonly subscribers: FunctionDefinition[];
  readonly snsTopic?: sns.Topic;
}

export class Topic extends cdk.Construct {
  public readonly snsTopic: sns.Topic;
  public readonly subscriberFunctions: Func[];

  constructor(scope: cdk.Construct, id: string, props: TopicProps) {
    super(scope, id);

    const root = scope.node.root as App;
    let {
      // Topic props
      snsTopic,
      // Function props
      subscribers,
    } = props;

    ////////////////////
    // Create Topic
    ////////////////////

    if ( ! snsTopic) {
      this.snsTopic = new sns.Topic(this, "Topic", {
        topicName: root.logicalPrefixedName(id),
      });
    }
    else {
      this.snsTopic = snsTopic;
    }

    ///////////////////////////
    // Create Subscribers
    ///////////////////////////

    if ( ! subscribers || subscribers.length === 0) {
      throw new Error(`No subscribers defined for the "${id}" Topic`);
    }

    this.subscriberFunctions = [];
    subscribers.forEach((subscriber, i) => {
      const func = Func.fromDefinition(this, `Subscriber_${i}`, subscriber);
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

