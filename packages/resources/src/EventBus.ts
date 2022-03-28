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
import { z } from "zod";
import {
  FunctionDefinitionSchema,
  FunctionInlineDefinitionSchema,
  FunctionPropsSchema,
} from ".";

/////////////////////
// Interfaces
/////////////////////

const EventBusFunctionTargetPropsSchema = z
  .object({
    function: FunctionDefinitionSchema,
  })
  .strict();
/**
 * Used to configure an EventBus function target
 */
export interface EventBusFunctionTargetProps {
  /**
   * The function to trigger
   *
   * @example
   * ```js
   * new EventBus(props.stack, "Bus", {
   *   rules: {
   *     rule1: {
   *       targets: [
   *         { function: "src/function.handler" },
   *       ]
   *     },
   *   },
   * });
   * ```
   */
  function: FunctionDefinition;
  cdk?: {
    target?: eventsTargets.LambdaFunctionProps;
  };
}

const EventBusQueueTargetPropsSchema = z
  .object({
    queue: z.instanceof(Queue),
  })
  .strict();
export interface EventBusQueueTargetProps {
  /**
   * The queue to trigger
   *
   * @example
   * ```js
   * new EventBus(props.stack, "Bus", {
   *   rules: {
   *     rule1: {
   *       targets: [
   *         { queue: new sst.Queue(props.stack, "Queue") },
   *       ]
   *     },
   *   },
   * });
   * ```
   */
  queue: Queue;
  cdk?: {
    target?: eventsTargets.SqsQueueProps;
  };
}
const EventBusRulePropsSchema = z
  .object({
    pattern: z
      .object({
        source: z.string().array().optional(),
        detail: z.record(z.string(), z.any()).optional(),
        detailType: z.string().array().optional(),
        targets: z
          .union([
            FunctionInlineDefinitionSchema,
            EventBusFunctionTargetPropsSchema,
            z.instanceof(Queue),
            EventBusQueueTargetPropsSchema,
          ])
          .array(),
      })
      .strict(),
  })
  .strict();
/**
 * Used to configure an EventBus rule
 */
export interface EventBusRuleProps {
  pattern?: {
    /**
     * A list of sources to filter on
     *
     * @example
     * ```js
     * new EventBus(this, "Bus", {
     *   rules: {
     *     rule1: {
     *       pattern: { source: ["myevent"] },
     *     },
     *   },
     * });
     * ```
     */
    source?: string[];
    /**
     * Fields to match on the detail field
     *
     * @example
     * ```js
     * new EventBus(this, "Bus", {
     *   rules: {
     *     rule1: {
     *       pattern: { detail: { FOO: 1 }  },
     *     },
     *   },
     * });
     * ```
     */
    detail?: { [key: string]: any };
    /**
     * A list of detailTypes to filter on
     *
     * @example
     * ```js
     * new EventBus(this, "Bus", {
     *   rules: {
     *     rule1: {
     *       pattern: { detailTypes: ["foo"]  },
     *     },
     *   },
     * });
     * ```
     */
    detailType?: string[];
  };
  /**
   * Configure targets for this rule. Can be a function or queue
   *
   * @example
   * ```js
   * new EventBus(props.stack, "Bus", {
   *   rules: {
   *     rule1: {
   *       targets: [
   *         "src/function.handler",
   *         new Queue(props.stack, "MyQueue"),
   *       ]
   *     },
   *   },
   * });
   * ```
   */
  targets?: (
    | FunctionInlineDefinition
    | EventBusFunctionTargetProps
    | Queue
    | EventBusQueueTargetProps
  )[];
  cdk?: {
    /**
     * Configure the internally created CDK `Rule` instance.
     *
     * @example
     * ```js {4}
     * new EventBus(this, "Bus", {
     *   DOCTODO
     * });
     * ```
     */
    rule?: Omit<events.RuleProps, "eventBus" | "targets">;
  };
}

const EventBusPropsSchema = z
  .object({
    defaults: z
      .object({
        function: FunctionPropsSchema.optional(),
      })
      .strict()
      .optional(),
    rules: z.record(z.string(), EventBusRulePropsSchema).optional(),
  })
  .strict()
  .optional();
export interface EventBusProps {
  defaults?: {
    /**
     * The default function props to be applied to all the Lambda functions in the EventBus. The `environment`, `permissions` and `layers` properties will be merged with per route definitions if they are defined.
     *
     * @example
     * ```js
     * new EventBus(props.stack, "Bus", {
     *   defaults: {
     *     function: {
     *       timeout: 20,
     *     }
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
   * ```js {5}
   * new EventBus(this, "Bus", {
   *   rules: {
   *     rule1: {
   *       pattern: { source: ["myevent"] },
   *       targets: ["src/target1.main"],
   *     },
   *   },
   * });
   * ```
   */
  rules?: Record<string, EventBusRuleProps>;
  cdk?: {
    /**
     * Override the internally created EventBus
     * @example
     * ```js
     * new EventBus(this, "Bus", {
     *   cdk: {
     *     eventBus: {
     *       eventBusName: "MyEventBus",
     *     },
     *   }
     * });
     * ```
     */
    eventBus?: events.IEventBus | events.EventBusProps;
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
    EventBusPropsSchema.parse(props);
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
   * ```js
   * bus.addRules(this, {
   *   rule2: {
   *     eventPattern: { source: ["myevent"] },
   *     targets: ["src/target3.main", "src/target4.main"],
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
   * ```js {10}
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
   *
   * @example
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
