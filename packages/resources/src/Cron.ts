import { Construct } from "constructs";
import * as events from "aws-cdk-lib/aws-events";
import * as eventsTargets from "aws-cdk-lib/aws-events-targets";

import { getFunctionRef, SSTConstruct } from "./Construct";
import {
  Function as Func,
  FunctionInlineDefinition,
  FunctionDefinition,
} from "./Function";
import { Duration, toCdkDuration } from "./util/duration";
import { Permissions } from "./util/permission";

export interface CronProps {
  cdk?: {
    /**
     * Optionally pass in a CDK EventBridge RuleProps. This allows you to override the default settings this construct uses internally to create the events rule.
     */
    rule?: events.RuleProps;
    cronOptions?: events.CronOptions;
  };
  job: FunctionInlineDefinition | CronJobProps;
  /**
   * The schedule for the cron job. Can be specified as a string. The string format takes a [rate expression](https://docs.aws.amazon.com/lambda/latest/dg/services-cloudwatchevents-expressions.html).
   *
   * ```
   * "rate(_Value Unit_)"
   *
   * // For example, every 5 minutes
   * "rate(5 minutes)"
   * ```
   *
   * Or as a [cron expression](https://en.wikipedia.org/wiki/Cron#CRON_expression).
   *
   * ```
   * "cron(Minutes Hours Day-of-month Month Day-of-week Year)"
   *
   * // For example, 10:15 AM (UTC) every day
   * "cron(15 10 * * ? *)"
   * ```
   *
   * You can also specify a duration as an alternative to defining the rate expression.
   *
   * ```txt {6}
   * // Repeat every 5 minutes
   *
   * "5 minutes"
   *
   * // The equivalent rate expression
   * "rate(5 minutes)"
   * ```
   *
   * Similarly, you can specify the cron expression using [`cdk.aws-events.CronOptions`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_events.CronOptions.html).
   *
   * ```txt {4}
   * // 10:15 AM (UTC) every day
   *
   * // As cdk.aws-events.CronOptions
   * { minute: "15", hour: "10" }
   *
   * // The equivalent cron expression
   * "cron(15 10 * * ? *)"
   * ```
   *
   * @example
   * ### Using the rate expression
   *
   * ```js
   * import { Cron } from "@serverless-stack/resources";
   *
   * new Cron(this, "Cron", {
   *   schedule: "rate(1 minute)",
   *   job: "src/lambda.main",
   * });
   * ```
   *
   * ### Using the cron expression
   *
   * ```js
   * new Cron(this, "Cron", {
   *   schedule: "cron(15 10 * * ? *)",
   *   job: "src/lambda.main",
   * });
   * ```
   *
   * ### Using Duration
   *
   * ```js
   * import { Duration } from "aws-cdk-lib";
   *
   * new Cron(this, "Cron", {
   *   schedule: Duration.days(1),
   *   job: "src/lambda.main",
   * });
   * ```
   *
   * ### Using CronOptions
   *
   * ```js
   * new Cron(this, "Cron", {
   *   schedule: { minute: "0", hour: "4" },
   *   job: "src/lambda.main",
   * });
   * ```
   */
  schedule?: `rate(${string})` | `cron(${string})` | Duration;
}

export interface CronJobProps {
  /**
   * A FunctionDefinition that'll be used to create the job function for the cron.
   */
  function: FunctionDefinition;
  cdk?: {
    target?: eventsTargets.LambdaFunctionProps;
  };
}

/////////////////////
// Construct
/////////////////////

/**
 * The `Cron` construct is a higher level CDK construct that makes it easy to create a cron job. You can create a cron job by handler function and specifying the schedule it needs to run on. Internally this construct uses a [EventBridge Rule](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_events.Rule.html).
 */
export class Cron extends Construct implements SSTConstruct {
  public readonly cdk: {
    /**
     * The internally created CDK EventBridge Rule instance.
     */
    rule: events.Rule;
  };
  /**
   * The internally created Function instance that'll be run on schedule.
   */
  public readonly jobFunction: Func;
  private props: CronProps;

  constructor(scope: Construct, id: string, props: CronProps) {
    super(scope, id);

    this.props = props;
    this.cdk = {} as any;

    this.createEventsRule();
    this.jobFunction = this.createRuleTarget();
  }

  /**
   * Attaches the given list of [permissions](../util/Permissions.md) to the `jobFunction`. This allows the function to access other AWS resources.
   *
   * Internally calls [`Function.attachPermissions`](Function.md#attachpermissions).
   *
   */
  public attachPermissions(permissions: Permissions): void {
    this.jobFunction.attachPermissions(permissions);
  }

  public getConstructMetadata() {
    const cfnRule = this.cdk.rule.node.defaultChild as events.CfnRule;
    return {
      type: "Cron" as const,
      data: {
        schedule: cfnRule.scheduleExpression,
        ruleName: this.cdk.rule.ruleName,
        job: getFunctionRef(this.jobFunction),
      },
    };
  }

  private createEventsRule() {
    const { cdk, schedule } = this.props;
    const id = this.node.id;

    // Validate: cannot set eventsRule.schedule
    if (cdk?.rule?.schedule) {
      throw new Error(
        `Do not configure the "eventsRule.schedule". Use the "schedule" to configure the Cron schedule.`
      );
    }

    // Configure Schedule
    let propSchedule: events.Schedule;
    if (cdk?.cronOptions) {
      propSchedule = events.Schedule.cron(cdk.cronOptions);
    } else if (schedule) {
      propSchedule =
        schedule.startsWith("rate(") || schedule.startsWith("cron(")
          ? events.Schedule.expression(schedule)
          : events.Schedule.rate(toCdkDuration(schedule as Duration));
    } else {
      throw new Error(`No schedule defined for the "${id}" Cron`);
    }

    this.cdk.rule = new events.Rule(this, "Rule", {
      schedule: propSchedule,
      ...cdk?.rule,
    });
  }

  private createRuleTarget() {
    const { job } = this.props;
    const id = this.node.id;

    if (!job) {
      throw new Error(`No job defined for the "${id}" Cron`);
    }

    // normalize job
    let jobFunction, jobProps;
    if ((job as CronJobProps).function) {
      jobFunction = (job as CronJobProps).function;
      jobProps = (job as CronJobProps).cdk?.target;
    } else {
      jobFunction = job as FunctionInlineDefinition;
      jobProps = {};
    }

    // create function
    const fn = Func.fromDefinition(this, "Job", jobFunction);
    this.cdk.rule.addTarget(new eventsTargets.LambdaFunction(fn, jobProps));

    return fn;
  }
}
