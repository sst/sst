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
import { z } from "zod";
import { FunctionDefinitionSchema, FunctionInlineDefinitionSchema } from ".";

export const CronPropsSchema = z
  .object({
    job: z.union([
      FunctionInlineDefinitionSchema,
      z
        .object({
          function: FunctionDefinitionSchema,
        })
        .strict(),
    ]),
    schedule: z.string(),
  })
  .strict();
export interface CronProps {
  cdk?: {
    /**
     * Override the default settings this construct uses internally to create the events rule.
     */
    rule?: events.RuleProps;
    /**
     * Override the internally created cron expression.
     */
    cronOptions?: events.CronOptions;
  };

  /**
   * The definition of the function to be executed
   *
   * @example
   * ```js
   * new Cron(this, "Cron", {
   *   function : "src/function.handler",
   * })
   * ```
   */
  job: FunctionInlineDefinition | CronJobProps;
  /**
   * The schedule for the cron job. The string format takes a [rate expression](https://docs.aws.amazon.com/lambda/latest/dg/services-cloudwatchevents-expressions.html).
   *
   * ```
   * "rate(_Value Unit_)"
   *
   * // For example, every 5 minutes
   * "rate(5 minutes)"
   * ```
   *
   * ```
   * "cron(Minutes Hours Day-of-month Month Day-of-week Year)"
   *
   * // For example, 10:15 AM (UTC) every day
   * "cron(15 10 * * ? *)"
   * ```
   *
   * ```txt
   * // Repeat every 5 minutes
   *
   * "5 minutes"
   *
   * // The equivalent rate expression
   * "rate(5 minutes)"
   * ```
   *
   * ```txt
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
   * ```js
   * import { Cron } from "@serverless-stack/resources";
   *
   * new Cron(this, "Cron", {
   *   job: "src/lambda.main",
   *   schedule: "rate(1 minute)",
   * });
   * ```
   *
   * ```js
   * new Cron(this, "Cron", {
   *   job: "src/lambda.main",
   *   schedule: "cron(15 10 * * ? *)",
   * });
   * ```
   */
  schedule?: `rate(${string})` | `cron(${string})` | Duration;
}

export interface CronJobProps {
  /**
   * The function that will be executed when the job runs.
   *
   * @example
   * ```js
   *   new Cron(this, "Cron", {
   *     job: {
   *       function: "src/lambda.main",
   *     },
   *   });
   * ```
   */
  function: FunctionDefinition;
  cdk?: {
    /**
     * Override the default settings this construct uses internally to create the events rule.
     */
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
    CronPropsSchema.parse(props);
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
