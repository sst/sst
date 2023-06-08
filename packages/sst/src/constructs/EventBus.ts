import { Construct } from "constructs";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as sqs from "aws-cdk-lib/aws-sqs";
import * as events from "aws-cdk-lib/aws-events";
import {
  LambdaFunction as LambdaFunctionTarget,
  LambdaFunctionProps as LambdaFunctionTargetProps,
  SqsQueue as SqsQueueTarget,
  SqsQueueProps as SqsQueueTargetProps,
  CloudWatchLogGroup as LogGroupTarget,
  LogGroupProps as LogGroupTargetProps,
} from "aws-cdk-lib/aws-events-targets";
import { ILogGroup } from "aws-cdk-lib/aws-logs";
import { App } from "./App.js";
import { Queue } from "./Queue.js";
import { getFunctionRef, SSTConstruct, isCDKConstruct } from "./Construct.js";
import {
  Function as Fn,
  FunctionProps,
  FunctionInlineDefinition,
  FunctionDefinition,
} from "./Function.js";
import { FunctionBindingProps } from "./util/functionBinding.js";
import { Permissions } from "./util/permission.js";
import { SqsEventSource } from "aws-cdk-lib/aws-lambda-event-sources";
import { SqsDestination } from "aws-cdk-lib/aws-lambda-destinations";
import url from "url";
import path from "path";
const __dirname = path.dirname(url.fileURLToPath(import.meta.url));

/////////////////////
// Interfaces
/////////////////////

/**
 * Used to configure an EventBus function target
 * @example
 * ```js
 * new EventBus(stack, "Bus", {
 *   rules: {
 *     myRule: {
 *       targets: {
 *         myTarget: { function: "src/function.handler" },
 *       }
 *     },
 *   },
 * });
 * ```
 */
export interface EventBusFunctionTargetProps {
  /**
   * String literal to signify that the target is a function
   */
  type?: "function";
  /**
   * The function to trigger
   */
  function?: FunctionDefinition;
  /**
   * Number of retries
   */
  retries?: number;
  cdk?: {
    function?: lambda.IFunction;
    target?: LambdaFunctionTargetProps;
  };
}

/**
 * Used to configure an EventBus queue target
 * @example
 * ```js
 * new EventBus(stack, "Bus", {
 *   rules: {
 *     myRule: {
 *       targets: {
 *         myTarget: {
 *           type: "queue",
 *           queue: new Queue(stack, "Queue")
 *         }
 *       }
 *     },
 *   },
 * });
 * ```
 */
export interface EventBusQueueTargetProps {
  /**
   * String literal to signify that the target is a queue
   */
  type: "queue";
  /**
   * The queue to trigger
   */
  queue: Queue;
  cdk?: {
    target?: SqsQueueTargetProps;
  };
}

/**
 * Used to configure an EventBus log group target
 * @example
 * ```js
 * new EventBus(stack, "Bus", {
 *   rules: {
 *     myRule: {
 *       targets: {
 *         myTarget: {
 *           type: "log_group",
 *           cdk: {
 *            logGroup: LogGroup.fromLogGroupName(stack, "Logs", "/my/target/log"),
 *           }
 *         }
 *       }
 *     },
 *   },
 * });
 * ```
 */
export interface EventBusLogGroupTargetProps {
  /**
   * String literal to signify that the target is a log group
   */
  type: "log_group";
  cdk: {
    logGroup: ILogGroup;
    target?: LogGroupTargetProps;
  };
}

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
     * new EventBus(stack, "Bus", {
     *   rules: {
     *     myRule: {
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
     * new EventBus(stack, "Bus", {
     *   rules: {
     *     myRule: {
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
     * new EventBus(stack, "Bus", {
     *   rules: {
     *     myRule: {
     *       pattern: { detailType: ["foo"]  },
     *     },
     *   },
     * });
     * ```
     */
    detailType?: string[];
  };
  /**
   * Configure targets for this rule.
   *
   * @example
   * ```js
   * new EventBus(stack, "Bus", {
   *   rules: {
   *     myRule: {
   *       targets: {
   *         myTarget1: "src/function.handler",
   *         myTarget2: new Queue(stack, "MyQueue"),
   *       }
   *     },
   *   },
   * });
   * ```
   */
  targets?: Record<
    string,
    | FunctionInlineDefinition
    | EventBusFunctionTargetProps
    | Queue
    | EventBusQueueTargetProps
    | EventBusLogGroupTargetProps
  >;
  cdk?: {
    /**
     * Configure the internally created CDK `Rule` instance.
     *
     * @example
     * ```js {5-8}
     * new EventBus(stack, "Bus", {
     *   rules: {
     *     myRule: {
     *       cdk: {
     *         rule: {
     *           ruleName: "my-rule",
     *           enabled: false,
     *         },
     *       },
     *       targets: {
     *         myTarget1: "src/lambda.handler",
     *       },
     *     },
     *   },
     * });
     * ```
     */
    rule?: Omit<events.RuleProps, "eventBus" | "targets">;
  };
}

export interface EventBusProps {
  defaults?: {
    /**
     * The default function props to be applied to all the Lambda functions in the EventBus. The `environment`, `permissions` and `layers` properties will be merged with per route definitions if they are defined.
     *
     * @example
     * ```js
     * new EventBus(stack, "Bus", {
     *   defaults: {
     *     function: {
     *       timeout: 20,
     *     }
     *   },
     * });
     * ```
     */
    function?: FunctionProps;
    /**
     * Enable retries with exponential backoff for all lambda function targets in this eventbus
     *
     * @example
     * ```js
     * new EventBus(stack, "Bus", {
     *   retries: 20
     * });
     * ```
     */
    retries?: number;
  };
  /**
   * The rules for the eventbus
   *
   * @example
   * ```js {5}
   * new EventBus(stack, "Bus", {
   *   rules: {
   *     myRule: {
   *       pattern: { source: ["myevent"] },
   *       targets: {
   *         myTarget: "src/function.handler"
   *       },
   *     },
   *   },
   * });
   * ```
   */
  rules?: Record<string, EventBusRuleProps>;
  cdk?: {
    /**
     * Allows you to override default id for this construct.
     */
    id?: string;
    /**
     * Override the internally created EventBus
     * @example
     * ```js
     * new EventBus(stack, "Bus", {
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
 * The `EventBus` construct is a higher level CDK construct that makes it easy to create an EventBridge Event Bus.
 *
 * @example
 *
 * ```js
 * import { EventBus } from "sst/constructs";
 *
 * new EventBus(stack, "Bus", {
 *   rules: {
 *     myRule: {
 *       pattern: { source: ["myevent"] },
 *       targets: {
 *         myTarget1: "src/function1.handler",
 *         myTarget2: "src/function2.handler"
 *       },
 *     },
 *   },
 * });
 * ```
 */
export class EventBus extends Construct implements SSTConstruct {
  public readonly id: string;
  public readonly cdk: {
    /**
     * The internally created CDK `EventBus` instance.
     */
    eventBus: events.IEventBus;
  };
  private readonly rulesData: Record<string, events.Rule> = {};
  private readonly targetsData: Record<
    string,
    Record<string, Fn | Queue | lambda.IFunction | ILogGroup>
  > = {};
  private readonly bindingForAllTargets: SSTConstruct[] = [];
  private readonly permissionsAttachedForAllTargets: Permissions[] = [];
  private readonly props: EventBusProps;

  constructor(scope: Construct, id: string, props?: EventBusProps) {
    super(scope, props?.cdk?.id || id);

    this.id = id;
    this.props = props || {};
    this.cdk = {} as any;

    this.createEventBus();
    this.addRules(this, props?.rules || {});
  }

  /**
   * The ARN of the internally created `EventBus` instance.
   */
  public get eventBusArn(): string {
    return this.cdk.eventBus.eventBusArn;
  }

  /**
   * The name of the internally created `EventBus` instance.
   */
  public get eventBusName(): string {
    return this.cdk.eventBus.eventBusName;
  }

  /**
   * Get a rule
   *
   * @example
   * ```js
   * bus.getRule("myRule");
   * ```
   */
  public getRule(key: string): events.Rule | undefined {
    return this.rulesData[key];
  }

  /**
   * Add rules after the EventBus has been created.
   *
   * @example
   * ```js
   * bus.addRules(stack, {
   *   myRule2: {
   *     pattern: { source: ["myevent"] },
   *       targets: {
   *         myTarget3: "src/function3.handler"
   *         myTarget4: "src/function4.handler"
   *       },
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
   * Add targets to existing rules.
   *
   * @example
   * ```js
   * bus.addRules(stack, "myRule", {
   *   myTarget1: "src/function1.handler"
   *   myTarget2: "src/function2.handler"
   * });
   * ```
   */
  public addTargets(
    scope: Construct,
    ruleKey: string,
    targets: Record<
      string,
      | FunctionInlineDefinition
      | EventBusFunctionTargetProps
      | Queue
      | EventBusQueueTargetProps
      | EventBusLogGroupTargetProps
    >
  ): void {
    // Get rule
    const eventsRule = this.getRule(ruleKey);
    if (!eventsRule) {
      throw new Error(
        `Cannot find the rule "${ruleKey}" in the "${this.node.id}" EventBus.`
      );
    }

    // Add targets
    Object.entries(targets).forEach(([targetName, target]) =>
      this.addTarget(scope, ruleKey, eventsRule, targetName, target)
    );
  }

  /**
   * Binds the given list of resources to all event targets in this EventBus.
   *
   * @example
   * ```js
   * bus.bind([STRIPE_KEY, bucket]);
   * ```
   */
  public bind(constructs: SSTConstruct[]) {
    Object.values(this.targetsData).forEach((rule) =>
      Object.values(rule)
        .filter((target) => target instanceof Fn)
        .forEach((target) => (target as Fn).bind(constructs))
    );

    this.bindingForAllTargets.push(...constructs);
  }

  /**
   * Binds the given list of resources to a specific event bus rule target
   *
   * @example
   * ```js
   * const bus = new EventBus(stack, "Bus", {
   *   rules: {
   *     myRule: {
   *       pattern: { source: ["myevent"] },
   *       targets: {
   *         myTarget1: "src/function1.handler"
   *         myTarget2: "src/function2.handler"
   *       },
   *     },
   *   },
   * });
   *
   * bus.bindToTarget("myRule", 0, [STRIPE_KEY, bucket]);
   * ```
   */
  public bindToTarget(
    ruleKey: string,
    targetName: string,
    constructs: SSTConstruct[]
  ): void {
    const rule = this.targetsData[ruleKey];
    if (!rule) {
      throw new Error(
        `Cannot find the rule "${ruleKey}" in the "${this.node.id}" EventBus.`
      );
    }

    const target = rule[targetName];
    if (!(target instanceof Fn)) {
      throw new Error(
        `Cannot bind to the "${this.node.id}" EventBus target because it's not a Lambda function`
      );
    }
    target.bind(constructs);
  }

  /**
   * Add permissions to all event targets in this EventBus.
   *
   * @example
   * ```js
   * bus.attachPermissions(["s3"]);
   * ```
   */
  public attachPermissions(permissions: Permissions) {
    Object.values(this.targetsData).forEach((rule) =>
      Object.values(rule)
        .filter((target) => target instanceof Fn)
        .forEach((target) => (target as Fn).attachPermissions(permissions))
    );

    this.permissionsAttachedForAllTargets.push(permissions);
  }

  /**
   * Add permissions to a specific event bus rule target
   *
   * @example
   * ```js
   * const bus = new EventBus(stack, "Bus", {
   *   rules: {
   *     myRule: {
   *       pattern: { source: ["myevent"] },
   *       targets: {
   *         myTarget1: "src/function1.handler"
   *         myTarget2: "src/function2.handler"
   *       },
   *     },
   *   },
   * });
   *
   * bus.attachPermissionsToTarget("myRule", 0, ["s3"]);
   * ```
   */
  public attachPermissionsToTarget(
    ruleKey: string,
    targetName: string,
    permissions: Permissions
  ): void {
    const rule = this.targetsData[ruleKey];
    if (!rule) {
      throw new Error(
        `Cannot find the rule "${ruleKey}" in the "${this.node.id}" EventBus.`
      );
    }

    const target = rule[targetName];
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
        rules: Object.entries(this.targetsData).map(([ruleName, rule]) => ({
          key: ruleName,
          targets: Object.values(rule).map(getFunctionRef).filter(Boolean),
          targetNames: Object.keys(rule),
        })),
      },
    };
  }

  /** @internal */
  public getFunctionBinding(): FunctionBindingProps {
    return {
      clientPackage: "event-bus",
      variables: {
        eventBusName: {
          type: "plain",
          value: this.eventBusName,
        },
      },
      permissions: {
        "events:*": [this.eventBusArn],
      },
    };
  }

  private retrierQueue: sqs.Queue | undefined;
  private retrierFn: lambda.Function | undefined;
  private retrierMap: Record<string, number> = {};
  private getRetrier() {
    const app = this.node.root as App;
    if (this.retrierFn && this.retrierQueue) {
      return { fn: this.retrierFn, queue: this.retrierQueue };
    }
    this.retrierQueue = new sqs.Queue(this, `RetrierQueue`, {
      queueName: app.logicalPrefixedName(this.node.id + "Retrier"),
    });
    this.retrierFn = new lambda.Function(this, `RetrierFunction`, {
      functionName: app.logicalPrefixedName(this.node.id + "Retrier"),
      runtime: lambda.Runtime.NODEJS_14_X,
      handler: "index.handler",
      code: lambda.Code.fromAsset(
        path.join(__dirname, "../support/event-bus-retrier")
      ),
      environment: {
        RETRIER_QUEUE_URL: this.retrierQueue.queueUrl,
      },
    });
    this.retrierFn.addEventSource(new SqsEventSource(this.retrierQueue));
    this.retrierQueue.grantSendMessages(this.retrierFn);
    return { fn: this.retrierFn, queue: this.retrierQueue };
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
    if (rule.cdk?.rule.eventBus) {
      throw new Error(
        `Cannot configure the "rule.cdk.rule.eventBus" in the "${this.node.id}" EventBus`
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
    this.rulesData[ruleKey] = eventsRule;

    // Create Targets
    this.addTargets(scope, ruleKey, rule.targets || {});
  }

  private addTarget(
    scope: Construct,
    ruleKey: string,
    eventsRule: events.Rule,
    targetName: string,
    target:
      | FunctionInlineDefinition
      | EventBusFunctionTargetProps
      | Queue
      | EventBusQueueTargetProps
      | EventBusLogGroupTargetProps
  ): void {
    this.targetsData[ruleKey] = this.targetsData[ruleKey] || {};

    // Validate rule not redefined
    if (this.targetsData[ruleKey][targetName]) {
      throw new Error(
        `A target with name "${targetName}" already exists in rule "${ruleKey}"`
      );
    }

    if (target instanceof Queue || (target as EventBusQueueTargetProps).queue) {
      target = target as Queue | EventBusQueueTargetProps;
      this.addQueueTarget(scope, ruleKey, eventsRule, targetName, target);
    } else if ((target as EventBusLogGroupTargetProps).cdk?.logGroup) {
      target = target as EventBusLogGroupTargetProps;
      this.addLogGroupTarget(scope, ruleKey, eventsRule, targetName, target);
    } else if ((target as EventBusFunctionTargetProps).cdk?.function) {
      target = target as EventBusFunctionTargetProps;
      this.addCdkFunctionTarget(scope, ruleKey, eventsRule, targetName, target);
    } else {
      target = target as FunctionInlineDefinition | EventBusFunctionTargetProps;
      this.addFunctionTarget(scope, ruleKey, eventsRule, targetName, target);
    }
  }

  private addQueueTarget(
    scope: Construct,
    ruleKey: string,
    eventsRule: events.Rule,
    targetName: string,
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
    this.targetsData[ruleKey][targetName] = queue;

    // Create target
    eventsRule.addTarget(new SqsQueueTarget(queue.cdk.queue, targetProps));
  }

  private addLogGroupTarget(
    scope: Construct,
    ruleKey: string,
    eventsRule: events.Rule,
    targetName: string,
    target: EventBusLogGroupTargetProps
  ): void {
    const { logGroup, target: targetProps } = target.cdk;
    this.targetsData[ruleKey][targetName] = logGroup;
    eventsRule.addTarget(new LogGroupTarget(logGroup, targetProps));
  }

  private addCdkFunctionTarget(
    scope: Construct,
    ruleKey: string,
    eventsRule: events.Rule,
    targetName: string,
    target: EventBusFunctionTargetProps
  ): void {
    // Parse target props
    const targetProps = target.cdk!.target;
    const fn = target.cdk!.function!;
    this.targetsData[ruleKey][targetName] = fn;

    // Create target
    eventsRule.addTarget(new LambdaFunctionTarget(fn, targetProps));
  }

  private subs = new Map<string, number>();
  public subscribe(
    type: string,
    target: FunctionDefinition,
    props?: { retries?: number }
  ) {
    const count = this.subs.get(type) || 0 + 1;
    this.subs.set(type, count);
    const name = `${type.replaceAll(/[^a-zA-Z_]/g, "_")}_${count}`;
    const retries = props?.retries || this.props.defaults?.retries;
    const fn = (() => {
      if (retries) {
        const retrier = this.getRetrier();
        const fn = Fn.fromDefinition(this, name, target, {
          onFailure: new SqsDestination(retrier.queue),
        });
        this.retrierMap[fn.functionArn] = retries;
        retrier.fn.addEnvironment(`RETRIES`, JSON.stringify(this.retrierMap));

        fn.grantInvoke(retrier.fn);
        return fn;
      }
      return Fn.fromDefinition(this, name, target);
    })();
    this.addRule(this, name + "_rule", {
      pattern: {
        detailType: [type],
      },
      targets: {
        [name + "_target"]: {
          type: "function",
          function: fn,
          retries: props?.retries,
        },
      },
    });
    return this;
  }

  private addFunctionTarget(
    scope: Construct,
    ruleKey: string,
    eventsRule: events.Rule,
    targetName: string,
    target: FunctionInlineDefinition | EventBusFunctionTargetProps
  ): void {
    // Parse target props
    let targetProps;
    let functionDefinition;
    let retries = this.props.defaults?.retries;
    if ((target as EventBusFunctionTargetProps).function) {
      target = target as EventBusFunctionTargetProps;
      targetProps = target.cdk?.target;
      functionDefinition = target.function!;
      if (target.retries) retries = target.retries;
    } else {
      target = target as FunctionInlineDefinition;
      functionDefinition = target;
    }

    // Create function
    const fn = Fn.fromDefinition(
      scope,
      `Target_${this.node.id}_${ruleKey}_${targetName}`,
      functionDefinition,
      this.props.defaults?.function,
      `The "defaults.function" cannot be applied if an instance of a Function construct is passed in. Make sure to define all the targets using FunctionProps, so the EventBus construct can apply the "defaults.function" to them.`
    );
    this.targetsData[ruleKey][targetName] = fn;

    // Create target
    eventsRule.addTarget(new LambdaFunctionTarget(fn, targetProps));

    // Attach existing permissions
    this.permissionsAttachedForAllTargets.forEach((permissions) =>
      fn.attachPermissions(permissions)
    );
    fn.bind(this.bindingForAllTargets);
  }
}
