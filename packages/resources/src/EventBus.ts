import { Construct } from 'constructs';
import * as events from "aws-cdk-lib/aws-events";
import * as eventsTargets from "aws-cdk-lib/aws-events-targets";
import { App } from "./App";
import { Queue } from "./Queue";
import { getFunctionRef, SSTConstruct, isCDKConstruct } from "./Construct";
import { Function as Fn, FunctionProps, FunctionDefinition } from "./Function";
import { Permissions } from "./util/permission";

/////////////////////
// Interfaces
/////////////////////

export type EventBusProps = {
  readonly eventBridgeEventBus?: events.IEventBus | events.EventBusProps;
  readonly rules?: { [key: string]: EventBusCdkRuleProps };
  readonly defaultFunctionProps?: FunctionProps;
};

export type EventBusCdkRuleProps = Omit<
  events.RuleProps,
  "eventBus" | "targets"
> & {
  readonly targets?: (
    | FunctionDefinition
    | EventBusFunctionTargetProps
    | Queue
    | EventBusQueueTargetProps
  )[];
};

export type EventBusFunctionTargetProps = {
  readonly function: FunctionDefinition;
  readonly targetProps?: eventsTargets.LambdaFunctionProps;
};

export type EventBusQueueTargetProps = {
  readonly queue: Queue;
  readonly targetProps?: eventsTargets.SqsQueueProps;
};

/////////////////////
// Construct
/////////////////////

export class EventBus extends Construct implements SSTConstruct {
  public readonly eventBridgeEventBus: events.IEventBus;
  private readonly targetsData: { [key: string]: (Fn | Queue)[] };
  private readonly permissionsAttachedForAllTargets: Permissions[];
  private readonly defaultFunctionProps?: FunctionProps;

  constructor(scope: Construct, id: string, props?: EventBusProps) {
    super(scope, id);

    const root = scope.node.root as App;
    const { eventBridgeEventBus, rules, defaultFunctionProps } = props || {};
    this.targetsData = {};
    this.permissionsAttachedForAllTargets = [];
    this.defaultFunctionProps = defaultFunctionProps;

    ////////////////////
    // Create EventBus
    ////////////////////

    if (isCDKConstruct(eventBridgeEventBus)) {
      this.eventBridgeEventBus = eventBridgeEventBus as events.EventBus;
    } else {
      const ebProps = (eventBridgeEventBus || {}) as events.EventBusProps;
      this.eventBridgeEventBus = new events.EventBus(this, "EventBus", {
        // Note: Set default eventBusName only if eventSourceName is not configured.
        //       This is because both cannot be configured at the same time.
        eventBusName: ebProps.eventSourceName
          ? undefined
          : root.logicalPrefixedName(id),
        ...ebProps,
      });
    }

    ///////////////////////////
    // Create Targets
    ///////////////////////////

    this.addRules(this, rules || {});
  }

  public get eventBusArn(): string {
    return this.eventBridgeEventBus.eventBusArn;
  }

  public get eventBusName(): string {
    return this.eventBridgeEventBus.eventBusName;
  }

  public addRules(
    scope: Construct,
    rules: { [key: string]: EventBusCdkRuleProps }
  ): void {
    Object.entries(rules).forEach(([ruleKey, rule]) =>
      this.addRule(scope, ruleKey, rule)
    );
  }

  public attachPermissions(permissions: Permissions): void {
    Object.keys(this.targetsData).forEach((ruleKey: string) => {
      this.targetsData[ruleKey]
        .filter((target) => target instanceof Fn)
        .forEach((target) => target.attachPermissions(permissions));
    });

    this.permissionsAttachedForAllTargets.push(permissions);
  }

  public attachPermissionsToTarget(
    ruleKey: string,
    targetIndex: number,
    permissions: Permissions
  ): void {
    const rule = this.targetsData[ruleKey];
    if (!rule) {
      throw new Error(
        `Cannot find the rule "${ruleKey}" in the "${this.node.id}" EventBus.`
      );
    }

    const target = rule[targetIndex];
    if (!(target instanceof Fn)) {
      throw new Error(
        `Cannot attach permissions to the "${this.node.id}" EventBus target because it's not a Lambda function`
      );
    }
    target.attachPermissions(permissions);
  }

  public getConstructMetadata() {
    return {
      type: "EventBus" as const,
      data: {
        eventBusName: this.eventBridgeEventBus.eventBusName,
        rules: Object.entries(this.targetsData).map(([key, targets]) => ({
          key: key,
          targets: targets.map(getFunctionRef).filter(Boolean),
        })),
      },
    };
  }

  private addRule(
    scope: Construct,
    ruleKey: string,
    rule: EventBusCdkRuleProps
  ): void {
    // Validate input
    // @ts-expect-error "eventBus" is not a prop
    if (rule.eventBus) {
      throw new Error(
        `Cannot configure the "rule.eventBus" in the "${this.node.id}" EventBus`
      );
    }

    // Validate rule not redefined
    if (this.targetsData[ruleKey]) {
      throw new Error(`A rule already exists for "${ruleKey}"`);
    }

    // Create Rule
    const root = this.node.root as App;
    const eventsRule = new events.Rule(scope, ruleKey, {
      ruleName: root.logicalPrefixedName(ruleKey),
      ...rule,
      eventBus: this.eventBridgeEventBus,
      targets: [],
    });

    // Create Targets
    (rule.targets || []).forEach((target) =>
      this.addTarget(scope, ruleKey, eventsRule, target)
    );
  }

  private addTarget(
    scope: Construct,
    ruleKey: string,
    eventsRule: events.Rule,
    target:
      | FunctionDefinition
      | EventBusFunctionTargetProps
      | Queue
      | EventBusQueueTargetProps
  ): void {
    if (target instanceof Queue || (target as EventBusQueueTargetProps).queue) {
      target = target as Queue | EventBusQueueTargetProps;
      this.addQueueTarget(scope, ruleKey, eventsRule, target);
    } else {
      target = target as FunctionDefinition | EventBusFunctionTargetProps;
      this.addFunctionTarget(scope, ruleKey, eventsRule, target);
    }
  }

  private addQueueTarget(
    scope: Construct,
    ruleKey: string,
    eventsRule: events.Rule,
    target: Queue | EventBusQueueTargetProps
  ): void {
    // Parse target props
    let targetProps;
    let queue;
    if (target instanceof Queue) {
      target = target as Queue;
      queue = target;
    } else {
      target = target as EventBusQueueTargetProps;
      targetProps = target.targetProps;
      queue = target.queue;
    }
    this.targetsData[ruleKey] = this.targetsData[ruleKey] || [];
    this.targetsData[ruleKey].push(queue);

    // Create target
    eventsRule.addTarget(
      new eventsTargets.SqsQueue(queue.sqsQueue, targetProps)
    );
  }

  private addFunctionTarget(
    scope: Construct,
    ruleKey: string,
    eventsRule: events.Rule,
    target: FunctionDefinition | EventBusFunctionTargetProps
  ): void {
    // Parse target props
    let targetProps;
    let functionDefinition;
    if ((target as EventBusFunctionTargetProps).function) {
      target = target as EventBusFunctionTargetProps;
      targetProps = target.targetProps;
      functionDefinition = target.function;
    } else {
      target = target as FunctionDefinition;
      functionDefinition = target;
    }

    // Create function
    this.targetsData[ruleKey] = this.targetsData[ruleKey] || [];
    const i = this.targetsData[ruleKey].length;
    const fn = Fn.fromDefinition(
      scope,
      `${ruleKey}_target_${i}`,
      functionDefinition,
      this.defaultFunctionProps,
      `The "defaultFunctionProps" cannot be applied if an instance of a Function construct is passed in. Make sure to define all the targets using FunctionProps, so the EventBus construct can apply the "defaultFunctionProps" to them.`
    );
    this.targetsData[ruleKey].push(fn);

    // Create target
    eventsRule.addTarget(new eventsTargets.LambdaFunction(fn, targetProps));

    // Attach existing permissions
    this.permissionsAttachedForAllTargets.forEach((permissions) =>
      fn.attachPermissions(permissions)
    );
  }
}
