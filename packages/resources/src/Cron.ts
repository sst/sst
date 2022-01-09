import { Construct } from 'constructs';
import * as cdk from "aws-cdk-lib";
import * as events from "aws-cdk-lib/aws-events";
import * as eventsTargets from "aws-cdk-lib/aws-events-targets";

import { Stack } from "./Stack";
import { getFunctionRef, SSTConstruct } from "./Construct";
import { Function as Func, FunctionDefinition } from "./Function";
import { Permissions } from "./util/permission";

export interface CronProps {
  readonly job: FunctionDefinition | CronJobProps;
  readonly schedule?: string | cdk.Duration | events.CronOptions;
  readonly eventsRule?: events.RuleProps;
}

export interface CronJobProps {
  readonly function: FunctionDefinition;
  readonly jobProps?: eventsTargets.LambdaFunctionProps;
}

export class Cron extends Construct implements SSTConstruct {
  public readonly eventsRule: events.Rule;
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
