import {
  ComponentResourceOptions,
  Input,
  Output,
  output,
} from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import { Component, transform } from "../component";
import { Function, FunctionArgs } from "./function";
import { SnsTopicSubscriberArgs } from "./sns-topic";

export interface Args extends SnsTopicSubscriberArgs {
  /**
   * The topic to use.
   */
  topic: Input<{
    /**
     * The ARN of the topic.
     */
    arn: Input<string>;
  }>;
  /**
   * The subscriber function.
   */
  subscriber: Input<string | FunctionArgs>;
}

/**
 * The `SnsTopicLambdaSubscriber` component is internally used by the `SnsTopic` component
 * to add subscriptions to [Amazon SNS topic](https://docs.aws.amazon.com/sns/latest/dg/sns-create-topic.html).
 *
 * :::caution
 * This component is not intended for public use.
 * :::
 *
 * You'll find this component returned by the `subscribe` method of the `SnsTopic` component.
 */
export class SnsTopicLambdaSubscriber extends Component {
  private readonly fn: Output<Function>;
  private readonly permission: aws.lambda.Permission;
  private readonly subscription: aws.sns.TopicSubscription;

  constructor(name: string, args: Args, opts?: ComponentResourceOptions) {
    super(__pulumiType, name, args, opts);

    const self = this;
    const topic = output(args.topic);
    const fn = createFunction();
    const permission = createPermission();
    const subscription = createSubscription();

    this.fn = fn;
    this.permission = permission;
    this.subscription = subscription;

    function createFunction() {
      return Function.fromDefinition(
        `${name}Function`,
        args.subscriber,
        {
          description: `Subscribed to ${name}`,
        },
        undefined,
        { parent: self },
      );
    }

    function createPermission() {
      return new aws.lambda.Permission(
        `${name}Permission`,
        {
          action: "lambda:InvokeFunction",
          function: fn.arn,
          principal: "sns.amazonaws.com",
          sourceArn: topic.arn,
        },
        { parent: self },
      );
    }

    function createSubscription() {
      return new aws.sns.TopicSubscription(
        `${name}Subscription`,
        transform(args?.transform?.subscription, {
          topic: topic.arn,
          protocol: "lambda",
          endpoint: fn.arn,
          filterPolicy: JSON.stringify(args.filter ?? {}),
        }),
        { parent: self, dependsOn: [permission] },
      );
    }
  }

  /**
   * The underlying [resources](/docs/components/#nodes) this component creates.
   */
  public get nodes() {
    const self = this;
    return {
      /**
       * The Lambda function that'll be notified.
       */
      function: this.fn,
      /**
       * The Lambda permission.
       */
      permission: this.permission,
      /**
       * The SNS topic subscription.
       */
      subscription: this.subscription,
    };
  }
}

const __pulumiType = "sst:aws:SnsTopicLambdaSubscriber";
// @ts-expect-error
SnsTopicLambdaSubscriber.__pulumiType = __pulumiType;
