import {
  Input,
  ComponentResourceOptions,
  output,
  Output,
} from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import { Component, Transform, transform } from "./component";
import { Function, FunctionArgs } from ".";

export interface CronJobProps {
  /**
   * The function that will be executed when the job runs.
   *
   * @example
   * ```js
   * {
   *   job: {
   *     function: "packages/functions/src/index.handler"
   *   }
   * }
   * ```
   */
  function: Input<string | FunctionArgs>;
}

export interface CronArgs {
  /**
   * Name of a database which is automatically created inside the cluster.
   * @default - Database is not created
   * @example
   * ```js
   * {
   *   job: "packages/functions/src/index.handler"
   * }
   * ```
   */
  job: Input<string | CronJobProps>;
  /**
   * The schedule for the cron job.
   *
   * The string format takes a [rate expression](https://docs.aws.amazon.com/lambda/latest/dg/services-cloudwatchevents-expressions.html).
   *
   * ```txt
   * rate(1 minute)
   * rate(5 minutes)
   * rate(1 hour)
   * rate(5 hours)
   * rate(1 day)
   * rate(5 days)
   * ```
   * Or as a [cron expression](https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-create-rule-schedule.html#eb-cron-expressions).
   *
   * ```txt
   * cron(15 10 * * ? *)    // 10:15 AM (UTC) every day.
   * ```
   *
   * @example
   * ```js
   * {
   *   schedule: "rate(5 minutes)",
   * }
   * ```
   * ```js
   * {
   *   schedule: "cron(15 10 * * ? *)",
   * }
   * ```
   */
  schedule: Input<`rate(${string})` | `cron(${string})`>;
  transform?: {
    rule?: Transform<aws.cloudwatch.EventRuleArgs>;
    target?: Transform<aws.cloudwatch.EventTargetArgs>;
  };
}

export class Cron extends Component {
  private fn: Output<Function>;
  private rule: aws.cloudwatch.EventRule;
  private target: aws.cloudwatch.EventTarget;

  constructor(name: string, args: CronArgs, opts?: ComponentResourceOptions) {
    super("sst:sst:Cron", name, args, opts);

    const parent = this;

    const fn = createFunction();
    const rule = createRule();
    const target = createTarget();
    createPermission();

    this.fn = fn;
    this.rule = rule;
    this.target = target;

    function createFunction() {
      return output(args.job).apply((job) => {
        const props =
          typeof job === "string"
            ? { handler: job }
            : typeof job.function === "string"
              ? { handler: job.function }
              : job.function;
        return new Function(`${name}Handler`, props, { parent });
      });
    }

    function createRule() {
      return new aws.cloudwatch.EventRule(
        `${name}Rule`,
        transform(args.transform?.rule, {
          scheduleExpression: args.schedule,
        }),
        { parent }
      );
    }

    function createTarget() {
      return new aws.cloudwatch.EventTarget(
        `${name}Target`,
        transform(args.transform?.target, {
          arn: fn.nodes.function.arn,
          rule: rule.name,
        }),
        { parent }
      );
    }

    function createPermission() {
      return new aws.lambda.Permission(
        `${name}Permission`,
        {
          action: "lambda:InvokeFunction",
          function: fn.nodes.function.arn,
          principal: "events.amazonaws.com",
          sourceArn: rule.arn,
        },
        { parent }
      );
    }
  }

  public get nodes() {
    return {
      job: this.fn,
      rule: this.rule,
      target: this.target,
    };
  }
}
