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
    /**
     * @example
     * ### Specifying function props for all targets
     *
     * You can extend the minimal config, to set some function props and have them apply to all the rules.
     *
     * ```js {3-7}
     * new EventBus(this, "Bus", {
     *   defaults: {
     *     function: {
     *       timeout: 20,
     *       environment: { tableName: table.tableName },
     *       permissions: [table],
     *     }
     *   },
     *   rules: {
     *     rule1: {
     *       eventPattern: { source: ["myevent"] },
     *       targets: ["src/target1.main", "src/target2.main"],
     *     },
     *   },
     * });
     * ```
     */
    function?: FunctionProps;
  };
  /**
   * The rules for the eventbus
   *
   * @example
   * ### Configuring Function targets
   *
   * #### Specifying the function path
   *
   * You can directly pass in the path to the [`Function`](Function.md).
   *
   * ```js {5}
   * new EventBus(this, "Bus", {
   *   rules: {
   *     rule1: {
   *       eventPattern: { source: ["myevent"] },
   *       targets: ["src/target1.main"],
   *     },
   *   },
   * });
   * ```
   *
   * #### Specifying function props
   *
   * If you wanted to configure each Lambda function separately, you can pass in the [`EventBusFunctionTargetProps`](#eventbusfunctiontargetprops).
   *
   * ```js {6-13}
   * new EventBus(this, "Bus", {
   *   rules: {
   *     rule1: {
   *       eventPattern: { source: ["myevent"] },
   *       targets: [
   *         {
   *           function: {
   *             srcPath: "src/",
   *             handler: "target1.main",
   *             environment: { tableName: table.tableName },
   *             permissions: [table],
   *           },
   *         },
   *       ],
   *     },
   *   },
   * });
   * ```
   *
   * Note that, you can set the `defaultFunctionProps` while using the `function` per target. The `function` will just override the `defaultFunctionProps`. Except for the `environment`, the `layers`, and the `permissions` properties, that will be merged.
   *
   * ```js
   * new EventBus(this, "Bus", {
   *   defaultFunctionProps: {
   *     timeout: 20,
   *     environment: { tableName: table.tableName },
   *     permissions: [table],
   *   },
   *   rules: {
   *     rule1: {
   *       eventPattern: { source: ["myevent"] },
   *       targets: [
   *         {
   *           function: {
   *             handler: "src/target1.main",
   *             timeout: 10,
   *             environment: { bucketName: bucket.bucketName },
   *             permissions: [bucket],
   *           },
   *         },
   *         "src/target2.main",
   *       ],
   *     },
   *   },
   * });
   * ```
   *
   * So in the above example, the `target1` function doesn't use the `timeout` that is set in the `defaultFunctionProps`. It'll instead use the one that is defined in the function definition (`10 seconds`). And the function will have both the `tableName` and the `bucketName` environment variables set; as well as permissions to both the `table` and the `bucket`.
   *
   * #### Configuring the target
   *
   * Configure the internally created CDK `Target`.
   *
   * ```js {8-10}
   * import { RuleTargetInput } from 'aws-cdk-lib/aws-events';
   *
   * new EventBus(this, "Bus", {
   *   rules: {
   *     rule1: {
   *       eventPattern: { source: ["myevent"] },
   *       targets: [
   *         {
   *           function: "src/target1.main",
   *           targetProps: {
   *             retryAttempts: 20,
   *             message: RuleTargetInput.fromEventPath('$.detail'),
   *           },
   *         },
   *       ],
   *     },
   *   },
   * });
   * ```
   * In the example above, the function is invoked with the contents of the `detail` property on the event, instead of the envelope -  i.e. the original payload put onto the EventBus.
   *
   * ### Configuring Queue targets
   *
   * #### Specifying the Queue directly
   *
   * You can directly pass in a [`Queue`](Queue.md).
   *
   * ```js {7}
   * const myQueue = new Queue(this, "MyQueue");
   *
   * new EventBus(this, "Bus", {
   *   rules: {
   *     rule1: {
   *       eventPattern: { source: ["myevent"] },
   *       targets: [myQueue],
   *     },
   *   },
   * });
   * ```
   *
   * #### Configuring the target
   *
   * Configure the internally created CDK `Target`.
   *
   * ```js {8-10}
   * new EventBus(this, "Bus", {
   *   rules: {
   *     rule1: {
   *       eventPattern: { source: ["myevent"] },
   *       targets: [
   *         {
   *           queue: myQueue,
   *           targetProps: {
   *             messageGroupId: "group1",
   *           },
   *         },
   *       ],
   *     },
   *   },
   * });
   * ```
   */
  rules?: Record<string, EventBusRuleProps>;
  cdk?: {
    /**
     * @example
     * ### Configuring the EventBus
     *
     * Configure the internally created CDK [`EventBus`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_events.EventBus.html) instance.
     *
     * ```js {2-4}
     * new EventBus(this, "Bus", {
     *   eventBridgeEventBus: {
     *     eventBusName: "MyEventBus",
     *   },
     *   rules: {
     *     rule1: {
     *       eventPattern: { source: ["myevent"] },
     *       targets: ["src/target1.main", "src/target2.main"],
     *     },
     *   },
     * });
     * ```
     */
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
    /**
     * @example
     * ### Configuring the Rule
     *
     * Configure the internally created CDK `Rule` instance.
     *
     * ```js {4}
     * new EventBus(this, "Bus", {
     *   rules: {
     *     rule1: {
     *       ruleName: "MyRule",
     *       eventPattern: { source: ["myevent"] },
     *       targets: ["src/target1.main", "src/target2.main"],
     *     },
     *   },
     * });
     * ```
     */
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

/**
 * The `EventBus` construct is a higher level CDK construct that makes it easy to create an [EventBridge Event Bus](https://aws.amazon.com/eventbridge/). You can create a bus that has a list of rules and targets. And you can publish messages to it from any part of your serverless app.
 *
 * You can have two types of targets; Function targets (with a Lambda function) or Queue targets (with an SQS queue). See the [examples](#examples) for more details.
 *
 * @example
 *
 * ### Using the minimal config
 *
 * ```js
 * import { EventBus } from "@serverless-stack/resources";
 *
 * new EventBus(this, "Bus", {
 *   rules: {
 *     rule1: {
 *       eventPattern: { source: ["myevent"] },
 *       targets: ["src/target1.main", "src/target2.main"],
 *     },
 *   },
 * });
 * ```
 *
 * Note that, `rule1` here is simply a key to identify the rule.
 */
export class EventBus extends Construct implements SSTConstruct {
  public readonly cdk: {
    /**
     * The internally created CDK `EventBus` instance.
     */
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

  /**
   * The ARN of the internally created CDK `EventBus` instance.
   */
  public get eventBusArn(): string {
    return this.cdk.eventBus.eventBusArn;
  }

  /**
   * The name of the internally created CDK `EventBus` instance.
   */
  public get eventBusName(): string {
    return this.cdk.eventBus.eventBusName;
  }

  /**
   * Add rules after the EventBus has been created.
   *
   * @example
   * ### Adding rules
   *
   * ```js
   * const bus = new EventBus(this, "Bus", {
   *   rules: {
   *     rule1: {
   *       eventPattern: { source: ["myevent"] },
   *       targets: ["src/target1.main", "src/target2.main"],
   *     },
   *   },
   * });
   *
   * bus.addRules(this, {
   *   rule2: {
   *     eventPattern: { source: ["myevent"] },
   *     targets: ["src/target3.main", "src/target4.main"],
   *   },
   * });
   * ```
   *
   * ### Lazily adding rules
   *
   * Create an _empty_ EventBus construct and lazily add the rules.
   *
   * ```js {3-8}
   * const bus = new EventBus(this, "Bus");
   *
   * bus.addRules(this, {
   *   rule1: {
   *     eventPattern: { source: ["myevent"] },
   *     targets: ["src/target1.main", "src/target2.main"],
   *   },
   * });
   * ```
   */
  public addRules(
    scope: Construct,
    rules: Record<string, EventBusRuleProps>
  ): void {
    Object.entries(rules).forEach(([ruleKey, rule]) =>
      this.addRule(scope, ruleKey, rule)
    );
  }

  /**
   * Add permissions to all event targets in this EventBus.
   *
   * @example
   * ### Attaching permissions for all targets
   *
   * Allow all the targets in the entire EventBus to access S3.
   *
   * ```js {10}
   * const bus = new EventBus(this, "Bus", {
   *   rules: {
   *     rule1: {
   *       eventPattern: { source: ["myevent"] },
   *       targets: ["src/target1.main", "src/target2.main"],
   *     },
   *   },
   * });
   *
   * bus.attachPermissions(["s3"]);
   * ```
   */
  public attachPermissions(permissions: Permissions): void {
    Object.keys(this.targetsData).forEach((ruleKey: string) => {
      this.targetsData[ruleKey]
        .filter((target) => target instanceof Fn)
        .forEach((target) => target.attachPermissions(permissions));
    });

    this.permissionsAttachedForAllTargets.push(permissions);
  }

  /**
   * Add permissions to a specific event bus rule target
   * @example
   * ### Attaching permissions for a specific target
   *
   * Allow one of the targets to access S3.
   *
   * ```js {10}
   * const bus = new EventBus(this, "Bus", {
   *   rules: {
   *     rule1: {
   *       eventPattern: { source: ["myevent"] },
   *       targets: ["src/target1.main", "src/target2.main"],
   *     },
   *   },
   * });
   *
   * bus.attachPermissionsToTarget("rule1", 0, ["s3"]);
   * ```
   *
   * Here we are referring to the rule using the rule key, `rule1`.
   */
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
