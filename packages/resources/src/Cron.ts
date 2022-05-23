import { Construct } from "constructs";
import * as events from "aws-cdk-lib/aws-events";
import * as eventsTargets from "aws-cdk-lib/aws-events-targets";

import { getFunctionRef, SSTConstruct } from "./Construct.js";
import {
  Function as Func,
  FunctionInlineDefinition,
  FunctionDefinition,
} from "./Function.js";
import { Permissions } from "./util/permission.js";

export interface CronJobProps {
  /**
   * The function that will be executed when the job runs.
   *
   * @example
   * ```js
   *   new Cron(stack, "Cron", {
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

export interface CronProps {
  /**
   * The definition of the function to be executed.
   *
   * @example
   * ```js
   * new Cron(stack, "Cron", {
   *   job : "src/lambda.main",
   *   schedule: "rate(5 minutes)",
   * })
   * ```
   */
  job: FunctionInlineDefinition | CronJobProps;
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
   * Or as a [cron expression](https://en.wikipedia.org/wiki/Cron#CRON_expression).
   *
   * ```txt
   * cron(15 10 * * ? *)    // 10:15 AM (UTC) every day.
   * ```
   *
   * @example
   * ```js
   * new Cron(stack, "Cron", {
   *   job: "src/lambda.main",
   *   schedule: "rate(5 minutes)",
   * });
   * ```
   * ```js
   * new Cron(stack, "Cron", {
   *   job: "src/lambda.main",
   *   schedule: "cron(15 10 * * ? *)",
   * });
   * ```
   */
  schedule?: `rate(${string})` | `cron(${string})`;
  /**
   * Indicates whether the cron job is enabled.
   * @default true
   * @example
   * ```js
   * new Cron(stack, "Cron", {
   *   job: "src/lambda.main",
   *   schedule: "rate(5 minutes)",
   *   enabled: app.local,
   * })
   * ```
   */
  enabled?: boolean;
  cdk?: {
    /**
     * Override the default settings this construct uses internally to create the events rule.
     */
    rule?: events.RuleProps;
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
   * Attaches the given list of [permissions](Permissions.md) to the `jobFunction`. This allows the function to access other AWS resources.
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
    const { cdk, schedule, enabled } = this.props;
    const id = this.node.id;

    // Configure Schedule
    if (!schedule && !cdk?.rule?.schedule) {
      throw new Error(`No schedule defined for the "${id}" Cron`);
    }

    this.cdk.rule = new events.Rule(this, "Rule", {
      schedule: schedule && events.Schedule.expression(schedule),
      enabled: enabled === false ? false : true,
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
