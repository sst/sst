import { Construct } from "constructs";
import * as events from "aws-cdk-lib/aws-events";
import * as eventsTargets from "aws-cdk-lib/aws-events-targets";
import { App } from "./App";
import { Queue } from "./Queue";
import { getFunctionRef, SSTConstruct, isCDKConstruct } from "./Construct";
import {
  Function as Fn,
  FunctionProps,
  FunctionInlineDefinition,
  FunctionDefinition,
} from "./Function";
import { Permissions } from "./util/permission";

/////////////////////
// Interfaces
/////////////////////

export interface EventBusProps {
  defaults?: {
    function?: FunctionProps;
  };
  rules?: { [key: string]: EventBusRuleProps };
  cdk?: {
    eventBus?: events.IEventBus | events.EventBusProps;
  };
}

export interface EventBusRuleProps {
  pattern?: {
    source?: string[];
    detail?: { [key: string]: any };
    detailType?: string[];
  };
  targets?: (
    | FunctionInlineDefinition
    | EventBusFunctionTargetProps
    | Queue
    | EventBusQueueTargetProps
  )[];
  cdk?: {
    rule?: Omit<events.RuleProps, "eventBus" | "targets">;
  };
}

export interface EventBusFunctionTargetProps {
  function: FunctionDefinition;
  cdk?: {
    target?: eventsTargets.LambdaFunctionProps;
  };
}

export interface EventBusQueueTargetProps {
  queue: Queue;
  cdk?: {
    target?: eventsTargets.SqsQueueProps;
  };
}

/////////////////////
// Construct
/////////////////////

export class EventBus extends Construct implements SSTConstruct {
  public readonly cdk: {
    eventBus: events.IEventBus;
  };
  private readonly targetsData: { [key: string]: (Fn | Queue)[] };
  private readonly permissionsAttachedForAllTargets: Permissions[];
  private readonly props: EventBusProps;

  constructor(scope: Construct, id: string, props?: EventBusProps) {
    super(scope, id);

    this.props = props || {};
    this.cdk = {} as any;
    this.targetsData = {};
    this.permissionsAttachedForAllTargets = [];

    this.createEventBus();
    this.addRules(this, props?.rules || {});
  }

  public get eventBusArn(): string {
    return this.cdk.eventBus.eventBusArn;
  }

  public get eventBusName(): string {
    return this.cdk.eventBus.eventBusName;
  }

  public addRules(
    scope: Construct,
    rules: { [key: string]: EventBusRuleProps }
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
        eventBusName: this.cdk.eventBus.eventBusName,
        rules: Object.entries(this.targetsData).map(([key, targets]) => ({
          key: key,
          targets: targets.map(getFunctionRef).filter(Boolean),
        })),
      },
    };
  }

  private createEventBus() {
    const app = this.node.root as App;
    const id = this.node.id;
    const { cdk } = this.props;

    if (isCDKConstruct(cdk?.eventBus)) {
      this.cdk.eventBus = cdk?.eventBus as events.EventBus;
    } else {
      const ebProps = (cdk?.eventBus || {}) as events.EventBusProps;
      this.cdk.eventBus = new events.EventBus(this, "EventBus", {
        // Note: Set default eventBusName only if eventSourceName is not configured.
        //       This is because both cannot be configured at the same time.
        eventBusName: ebProps.eventSourceName
          ? undefined
          : app.logicalPrefixedName(id),
        ...ebProps,
      });
    }
  }

  private addRule(
    scope: Construct,
    ruleKey: string,
    rule: EventBusRuleProps
  ): void {
    // Validate input
    // @ts-expect-error "eventBus" is not a prop
    if (rule.cdk?.ruleProps.eventBus) {
      throw new Error(
        `Cannot configure the "rule.cdk.ruleProps.eventBus" in the "${this.node.id}" EventBus`
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
      ...rule.cdk?.rule,
      eventPattern: rule.pattern
        ? { ...rule.pattern }
        : rule.cdk?.rule?.eventPattern,
      eventBus: this.cdk.eventBus,
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
      | FunctionInlineDefinition
      | EventBusFunctionTargetProps
      | Queue
      | EventBusQueueTargetProps
  ): void {
    if (target instanceof Queue || (target as EventBusQueueTargetProps).queue) {
      target = target as Queue | EventBusQueueTargetProps;
      this.addQueueTarget(scope, ruleKey, eventsRule, target);
    } else {
      target = target as FunctionInlineDefinition | EventBusFunctionTargetProps;
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
      targetProps = target.cdk?.target;
      queue = target.queue;
    }
    this.targetsData[ruleKey] = this.targetsData[ruleKey] || [];
    this.targetsData[ruleKey].push(queue);

    // Create target
    eventsRule.addTarget(
      new eventsTargets.SqsQueue(queue.cdk.queue, targetProps)
    );
  }

  private addFunctionTarget(
    scope: Construct,
    ruleKey: string,
    eventsRule: events.Rule,
    target: FunctionInlineDefinition | EventBusFunctionTargetProps
  ): void {
    // Parse target props
    let targetProps;
    let functionDefinition;
    if ((target as EventBusFunctionTargetProps).function) {
      target = target as EventBusFunctionTargetProps;
      targetProps = target.cdk?.target;
      functionDefinition = target.function;
    } else {
      target = target as FunctionInlineDefinition;
      functionDefinition = target;
    }

    // Create function
    this.targetsData[ruleKey] = this.targetsData[ruleKey] || [];
    const i = this.targetsData[ruleKey].length;
    const fn = Fn.fromDefinition(
      scope,
      `${ruleKey}_target_${i}`,
      functionDefinition,
      this.props.defaults?.function,
      `The "defaults.function" cannot be applied if an instance of a Function construct is passed in. Make sure to define all the targets using FunctionProps, so the EventBus construct can apply the "defaults.function" to them.`
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
