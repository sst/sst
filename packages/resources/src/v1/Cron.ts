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
    rule?: events.RuleProps;
    cronOptions?: events.CronOptions;
  };
  job: FunctionInlineDefinition | CronJobProps;
  schedule?: `rate(${string})` | `cron(${string})` | Duration;
}

export interface CronJobProps {
  function: FunctionDefinition;
  cdk?: {
    targetProps?: eventsTargets.LambdaFunctionProps;
  };
}

/////////////////////
// Construct
/////////////////////

export class Cron extends Construct implements SSTConstruct {
  public readonly cdk: {
    rule: events.Rule;
  };
  public readonly jobFunction: Func;
  private props: CronProps;

  constructor(scope: Construct, id: string, props: CronProps) {
    super(scope, id);

    this.props = props;
    this.cdk = {} as any;

    this.createEventsRule();
    this.jobFunction = this.createRuleTarget();
  }

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
      jobProps = (job as CronJobProps).cdk?.targetProps;
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
