import { Construct } from "constructs";
import * as cdk from "aws-cdk-lib";
import * as events from "aws-cdk-lib/aws-events";
import * as eventsTargets from "aws-cdk-lib/aws-events-targets";

import { getFunctionRef, SSTConstruct } from "./Construct";
import { Function as Func, FunctionDefinition } from "./Function";
import { Permissions } from "./util/permission";

export interface CronProps {
  /**
   * Function to execute for the cron job
   */
  job: FunctionDefinition | CronJobProps;
  /**
   * The schedule for the cron job.
   *
   * @example
   * The string format can take a [rate expression](https://docs.aws.amazon.com/lambda/latest/dg/services-cloudwatchevents-expressions.html)
   * ```
   * "rate(_Value Unit_)"
   *
   * // For example, every 5 minutes
   * "rate(5 minutes)"
   * ```
   *
   * @example
   * Or a [cron expression](https://en.wikipedia.org/wiki/Cron#CRON_expression)
   * ```
   * "cron(Minutes Hours Day-of-month Month Day-of-week Year)"
   *
   * // For example, 10:15 AM (UTC) every days
   * "cron(15 10 * * ? *)"
   * ```
   *
   * @example
   * You can also use [cdk.Duration](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.Duration.html)
   * as an alternative to defining the rate expression
   * ``` {6}
   * import { Duration } from "aws-cdk-lib";
   *
   * // Repeat every 5 minutes
   * // As cdk.Duration
   * Duration.minutes(5)
   *
   * // The equivalent rate expression
   * "rate(5 minutes)"
   * ```
   *
   * @example
   * Similarly, you can specify the cron expression using cdk.aws-events.CronOptions.
   */
  schedule?: string | cdk.Duration | events.CronOptions;
  /**
   * Optionally pass in a CDK EventBridge RuleProps.
   * This allows you to override the default settings this construct uses internally
   * to create the events rule.
   */
  eventsRule?: events.RuleProps;
}

export interface CronJobProps {
  /**
   * A [FunctionDefinition]{@link Function.FunctionDefinition}
   * object that'll be used to create the job function for the cron.
   */
  function: FunctionDefinition;

  /**
   * Optionally pass in a CDK LambdaFunctionProps.
   * This allows you to override the default settings this construct uses internally to created
   * the job.
   */
  jobProps?: eventsTargets.LambdaFunctionProps;
}

/**
 * The Cron construct is a higher level CDK construct that makes it easy to create a cron job.
 * You can create a cron job by handler function and specifying the schedule it needs to run on.
 * Internally this construct uses an [EventBridge Rule](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_events.Rule.html).
 *
 * @example
 * ### Using the rate expression
 * ```ts
 * import { Cron } from "@serverless-stack/resources";
 * new Cron(this, "Cron", {
 *   schedule: "rate(1 minute)",
 *   job: "src/lambda.main",
 * });
 * ```
 *
 * @example
 * ### Using the cron expression
 * ```ts
 * new Cron(this, "Cron", {
 *   schedule: "cron(15 10 * * ? *)",
 *   job: "src/lambda.main",
 * });
 * ```
 *
 * @example
 * ### Using duration
 * ```ts
 * import { Duration } from "aws-cdk-lib";
 *
 * new Cron(this, "Cron", {
 *   schedule: Duration.days(1),
 *   job: "src/lambda.main",
 * });
 * ```
 *
 * @example
 * ### Using CronOptions
 * ```ts
 * new Cron(this, "Cron", {
 *   schedule: { minute: "0", hour: "4" },
 *   job: "src/lambda.main",
 * });
 * ```
 *
 * @example
 * ### Giving the cron job some Permissions
 * Allow the function to access S3.
 * ```ts {6}
 * const cron = new Cron(this, "Cron", {
 *   schedule: "rate(1 minute)",
 *   job: "src/lambda.main",
 * });
 * // Allow the function to access S3.
 * cron.attachPermissions(["s3"]);
 * ```
 *
 * @example
 * ### Configuring the job
 * Configure the internally created CDK `Event Target`.
 * ```ts
 * import { RuleTargetInput } from "aws-cdk-lib/aws-events";
 *
 * new Cron(this, "Cron", {
 *   schedule: "rate(1 minute)",
 *   job: {
 *     function: "src/lambda.main",
 *     jobProps: {
 *       event: RuleTargetInput.fromObject({
 *         key: "value"
 *       }),
 *     },
 *   },
 * });
 *```
 */
export class Cron extends Construct implements SSTConstruct {
  /**
   * The internally created EventBridge Rule instance
   */
  public readonly eventsRule: events.Rule;
  /**
   * The internally created [Function](Function) instance that'll be run on schedule.
   */
  public readonly jobFunction: Func;

  constructor(scope: Construct, id: string, props: CronProps) {
    super(scope, id);

    const {
      // Topic props
      schedule,
      eventsRule,
      // Function props
      job,
    } = props;

    ///////////////////////////
    // Create Rule
    ///////////////////////////

    const eventsRuleProps = (eventsRule || {}) as events.RuleProps;

    // Validate: cannot set eventsRule.schedule
    if (eventsRuleProps.schedule) {
      throw new Error(
        `Do not configure the "eventsRule.schedule". Use the "schedule" to configure the Cron schedule.`
      );
    }

    // Validate: schedule is set
    if (!schedule) {
      throw new Error(`No schedule defined for the "${id}" Cron`);
    }

    // Configure Schedule
    let propSchedule: events.Schedule;
    if (
      typeof schedule === "string" &&
      (schedule.startsWith("rate(") || schedule.startsWith("cron("))
    ) {
      propSchedule = events.Schedule.expression(schedule);
    } else if (schedule instanceof cdk.Duration) {
      propSchedule = events.Schedule.rate(schedule);
    } else {
      propSchedule = events.Schedule.cron(schedule as events.CronOptions);
    }

    this.eventsRule = new events.Rule(this, "Rule", {
      schedule: propSchedule,
      ...eventsRuleProps,
    });

    ///////////////////////////
    // Create Targets
    ///////////////////////////

    if (!job) {
      throw new Error(`No job defined for the "${id}" Cron`);
    }

    // normalize job
    let jobFunction, jobProps;
    if ((job as CronJobProps).function) {
      jobFunction = (job as CronJobProps).function;
      jobProps = (job as CronJobProps).jobProps;
    } else {
      jobFunction = job as FunctionDefinition;
      jobProps = {};
    }

    // create function
    this.jobFunction = Func.fromDefinition(this, "Job", jobFunction);
    this.eventsRule.addTarget(
      new eventsTargets.LambdaFunction(this.jobFunction, jobProps)
    );
  }

  /**
   * Attaches the given list of permissions to the jobFunction.
   * This allows the function to access other AWS resources.
   * Internally calls {@link Function.attachPermissions}
   */
  public attachPermissions(permissions: Permissions): void {
    this.jobFunction.attachPermissions(permissions);
  }

  public getConstructMetadata() {
    const cfnRule = this.eventsRule.node.defaultChild as events.CfnRule;
    return {
      type: "Cron" as const,
      data: {
        schedule: cfnRule.scheduleExpression,
        ruleName: this.eventsRule.ruleName,
        job: getFunctionRef(this.jobFunction),
      },
    };
  }
}
