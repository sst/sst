import * as cdk from "@aws-cdk/core";
import * as events from "@aws-cdk/aws-events";
import * as eventsTargets from "@aws-cdk/aws-events-targets";
import { App } from "./App";
import { Function as Func, FunctionProps, FunctionPermissions } from "./Function";

export interface SchedulerProps {
  readonly schedule: string | cdk.Duration | events.CronOptions;
  readonly job: string | FunctionProps;
  readonly ruleProps?: events.RuleProps;
}

export class Scheduler extends cdk.Construct {
  public readonly eventRule: events.Rule;
  public readonly jobFunction: Func;

  constructor(scope: cdk.Construct, id: string, props: SchedulerProps) {
    super(scope, id);

    const root = scope.node.root as App;
    let {
      // Convenience props
      schedule,
      job,
      // Full functionality props
      ruleProps,
    } = props;

    // Validate input
    if (ruleProps !== undefined && schedule !== undefined) {
      throw new Error(`Cannot define both schedule and ruleProps`);
    }

    ///////////////////////////
    // Configure Rule
    ///////////////////////////

    if (ruleProps === undefined) {
      // Configure Schedule
      let propSchedule: events.Schedule;
      if ( ! schedule) {
        throw new Error(`No schedule defined for the "${id}" Scheduler`);
      }
      if (typeof schedule === 'string'
        && (schedule.startsWith('rate(') || schedule.startsWith('cron('))) {
        propSchedule = events.Schedule.expression(schedule);
      }
      else if (schedule instanceof cdk.Duration) {
        propSchedule = events.Schedule.rate(schedule);
      }
      else {
        propSchedule = events.Schedule.cron(schedule as events.CronOptions);
      }

      ruleProps = {
        schedule: propSchedule
      };
    }

    ///////////////////////////
    // Create Targets
    ///////////////////////////

    if ( ! job) {
      throw new Error(`No job defined for the "${id}" Scheduler`);
    }

    const functionProps = (typeof job === "string") ? { handler: job } : job;
    this.jobFunction = new Func(this, "Job", functionProps);

    ////////////////////
    // Create Rule
    ////////////////////

    this.eventRule = new events.Rule(this, "Rule", { ...ruleProps,
      targets: [ new eventsTargets.LambdaFunction(this.jobFunction) ],
    });
  }

  attachPermissions(permissions: FunctionPermissions) {
    this.jobFunction.attachPermissions(permissions)
  }
}

