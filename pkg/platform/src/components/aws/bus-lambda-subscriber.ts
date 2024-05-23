import {
  ComponentResourceOptions,
  Input,
  Output,
  interpolate,
  output,
} from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import { Component, transform } from "../component";
import { Function, FunctionArgs } from "./function";
import { BusSubscriberArgs } from "./bus";

export interface Args extends BusSubscriberArgs {
  /**
   * The bus to use.
   */
  bus: Input<{
    /**
     * The ARN of the bus.
     */
    arn: Input<string>;
    /**
     * The name of the bus.
     */
    name: Input<string>;
  }>;
  /**
   * The subscriber function.
   */
  subscriber: Input<string | FunctionArgs>;
}

/**
 * The `BusLambdaSubscriber` component is internally used by the `Bus` component
 * to add subscriptions to [Amazon EventBridge Event Bus](https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-event-bus.html).
 *
 * :::caution
 * This component is not intended for public use.
 * :::
 *
 * You'll find this component returned by the `subscribe` method of the `Bus` component.
 */
export class BusLambdaSubscriber extends Component {
  private readonly fn: Output<Function>;
  private readonly permission: aws.lambda.Permission;
  private readonly rule: aws.cloudwatch.EventRule;
  private readonly target: aws.cloudwatch.EventTarget;

  constructor(name: string, args: Args, opts?: ComponentResourceOptions) {
    super(__pulumiType, name, args, opts);

    const self = this;
    const bus = output(args.bus);
    const rule = createRule();
    const fn = createFunction();
    const permission = createPermission();
    const target = createTarget();

    this.fn = fn;
    this.permission = permission;
    this.rule = rule;
    this.target = target;

    function createFunction() {
      return Function.fromDefinition(
        `${name}Function`,
        args.subscriber,
        {
          description: interpolate`Subscribed to ${bus.name}`,
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
          principal: "events.amazonaws.com",
          sourceArn: rule.arn,
        },
        { parent: self },
      );
    }

    function createRule() {
      return new aws.cloudwatch.EventRule(
        `${name}Rule`,
        transform(args?.transform?.rule, {
          eventBusName: bus.name,
          eventPattern: args.pattern
            ? output(args.pattern).apply((pattern) =>
                JSON.stringify({
                  "detail-type": pattern.detailType,
                  source: pattern.source,
                  detail: pattern.detail,
                }),
              )
            : JSON.stringify({
                source: [{ prefix: "" }],
              }),
        }),
        { parent: self },
      );
    }

    function createTarget() {
      return new aws.cloudwatch.EventTarget(
        `${name}Target`,
        transform(args?.transform?.target, {
          arn: fn.arn,
          rule: rule.name,
          eventBusName: bus.name,
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
       * The EventBus rule.
       */
      rule: this.rule,
      /**
       * The EventBus target.
       */
      target: this.target,
    };
  }
}

const __pulumiType = "sst:aws:BusLambdaSubscriber";
// @ts-expect-error
BusLambdaSubscriber.__pulumiType = __pulumiType;
