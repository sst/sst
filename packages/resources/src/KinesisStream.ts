import { Construct } from "constructs";
import * as kinesis from "aws-cdk-lib/aws-kinesis";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as lambdaEventSources from "aws-cdk-lib/aws-lambda-event-sources";
import { App } from "./App.js";
import { getFunctionRef, SSTConstruct, isCDKConstruct } from "./Construct.js";
import {
  Function as Fn,
  FunctionProps,
  FunctionInlineDefinition,
  FunctionDefinition,
} from "./Function.js";
import { Permissions } from "./util/permission.js";

/////////////////////
// Interfaces
/////////////////////

/**
 * Used to define the function consumer for the stream
 */
export interface KinesisStreamConsumerProps {
  /**
   * The function definition
   *
   * @example
   * ```js
   * new KinesisStream(stack, "Stream", {
   *   consumers: {
   *     consumer1: {
   *       function: {
   *         handler: "src/consumer1.handler",
   *         timeout: 30
   *       }
   *     }
   *   }
   * });
   * ```
   */
  function: FunctionDefinition;
  cdk?: {
    /**
     * Override the interally created event source
     *
     * @example
     * ```js
     * new KinesisStream(stack, "Stream", {
     *   consumers: {
     *     fun: {
     *       cdk: {
     *         eventSource: {
     *           enabled: false
     *         }
     *       }
     *     }
     *   }
     * });
     * ```
     */
    eventSource?: lambdaEventSources.KinesisEventSourceProps;
  };
}

export interface KinesisStreamProps {
  defaults?: {
    /**
     * The default function props to be applied to all the Lambda functions in the API. The `environment`, `permissions` and `layers` properties will be merged with per route definitions if they are defined.
     *
     * @example
     * ```js
     * new KinesisStream(stack, "Stream", {
     *   defaults: {
     *     function: {
     *       timeout: 20,
     *     }
     *   }
     * });
     * ```
     */
    function?: FunctionProps;
  };
  /**
   * Define the function consumers for this stream
   *
   * @example
   * ```js
   * new KinesisStream(stack, "Stream", {
   *   consumers: {
   *     consumer1: "src/consumer1.main",
   *     consumer2: {
   *       function: {
   *         handler: "src/consumer2.handler",
   *         timeout: 30
   *       }
   *     }
   *   }
   * });
   * ```
   */
  consumers?: Record<
    string,
    FunctionInlineDefinition | KinesisStreamConsumerProps
  >;
  cdk?: {
    /**
     * Allows you to override default id for this construct.
     */
    id?: string;
    /**
     * Override the internally created Kinesis Stream
     *
     * @example
     * ```js
     * new KinesisStream(stack, "Stream", {
     *   cdk: {
     *     stream: {
     *       streamName: "my-stream",
     *     }
     *   }
     * });
     * ```
     */
    stream?: kinesis.IStream | kinesis.StreamProps;
  };
}

/////////////////////
// Construct
/////////////////////

/**
 * The `KinesisStream` construct is a higher level CDK construct that makes it easy to create a Kinesis Data Stream and add a list of consumers to it.
 *
 * @example
 *
 * ```js
 * import { KinesisStream } from "@serverless-stack/resources";
 *
 * new KinesisStream(stack, "Stream", {
 *   consumers: {
 *     myConsumer: "src/lambda.main",
 *   }
 * });
 * ```
 */
export class KinesisStream extends Construct implements SSTConstruct {
  public readonly id: string;
  public readonly cdk: {
    /**
     * Return internally created Kinesis Stream
     */
    stream: kinesis.IStream;
  };
  private functions: { [consumerName: string]: Fn } = {};
  private readonly bindingForAllConsumers: SSTConstruct[] = [];
  private readonly permissionsAttachedForAllConsumers: Permissions[] = [];
  private readonly props: KinesisStreamProps;

  constructor(scope: Construct, id: string, props?: KinesisStreamProps) {
    super(scope, props?.cdk?.id || id);

    this.id = id;
    this.props = props || {};
    this.cdk = {} as any;

    this.createStream();

    // Create Consumers
    if (props?.consumers) {
      for (const consumerName in props.consumers) {
        this.addConsumer(this, consumerName, props.consumers[consumerName]);
      }
    }
  }

  /**
   * The ARN of the internally created Kinesis Stream
   */
  public get streamArn(): string {
    return this.cdk.stream.streamArn;
  }

  /**
   * The name of the internally created Kinesis Stream
   */
  public get streamName(): string {
    return this.cdk.stream.streamName;
  }

  /**
   * Add consumers to a stream after creating it
   *
   * @example
   * ```js
   * stream.addConsumers(stack, {
   *   consumer1: "src/function.handler"
   * })
   * ```
   */
  public addConsumers(
    scope: Construct,
    consumers: {
      [consumerName: string]:
      | FunctionInlineDefinition
      | KinesisStreamConsumerProps;
    }
  ): void {
    Object.keys(consumers).forEach((consumerName: string) => {
      this.addConsumer(scope, consumerName, consumers[consumerName]);
    });
  }

  /**
   * Binds the given list of resources to all the consumers.
   *
   * @example
   *
   * ```js
   * stream.bind([STRIPE_KEY, bucket]]);
   * ```
   */
  public bind(constructs: SSTConstruct[]) {
    Object.values(this.functions).forEach((fn) =>
      fn.bind(constructs)
    );
    this.bindingForAllConsumers.push(...constructs);
  }

  /**
   * Binds the given list of resources to a specific consumer.
   *
   * @example
   * ```js
   * stream.bindToConsumer("consumer1", [STRIPE_KEY, bucket]);
   * ```
   */
  public bindToConsumer(
    consumerName: string,
    constructs: SSTConstruct[]
  ): void {
    if (!this.functions[consumerName]) {
      throw new Error(
        `The "${consumerName}" consumer was not found in the "${this.node.id}" KinesisStream.`
      );
    }

    this.functions[consumerName].bind(constructs);
  }

  /**
   * Attaches the given list of permissions to all the consumers. This allows the functions to access other AWS resources.
   *
   * @example
   *
   * ```js
   * stream.attachPermissions(["s3"]);
   * ```
   */
  public attachPermissions(permissions: Permissions) {
    Object.values(this.functions).forEach((fn) =>
      fn.attachPermissions(permissions)
    );
    this.permissionsAttachedForAllConsumers.push(permissions);
  }

  /**
   * Attaches the given list of permissions to a specific consumer. This allows that function to access other AWS resources.
   *
   * @example
   * ```js
   * stream.attachPermissionsToConsumer("consumer1", ["s3"]);
   * ```
   */
  public attachPermissionsToConsumer(
    consumerName: string,
    permissions: Permissions
  ): void {
    if (!this.functions[consumerName]) {
      throw new Error(
        `The "${consumerName}" consumer was not found in the "${this.node.id}" KinesisStream.`
      );
    }

    this.functions[consumerName].attachPermissions(permissions);
  }

  /**
   * Get the function for a specific consumer
   *
   * @example
   * ```js
   * stream.getFunction("consumer1");
   * ```
   */
  public getFunction(consumerName: string): Fn | undefined {
    return this.functions[consumerName];
  }

  public getConstructMetadata() {
    return {
      type: "KinesisStream" as const,
      data: {
        streamName: this.cdk.stream.streamName,
        consumers: Object.entries(this.functions).map(([name, fn]) => ({
          name,
          fn: getFunctionRef(fn),
        })),
      },
    };
  }

  /** @internal */
  public getFunctionBinding() {
    return {
      clientPackage: "kinesis-stream",
      variables: {
        streamName: {
          environment: this.streamName,
          parameter: this.streamName,
        },
      },
      permissions: {
        "kinesis:*": [this.streamArn],
      },
    };
  }

  private createStream() {
    const { cdk } = this.props;
    const app = this.node.root as App;
    const id = this.node.id;

    if (isCDKConstruct(cdk?.stream)) {
      this.cdk.stream = cdk?.stream as kinesis.IStream;
    } else {
      const kinesisStreamProps = (cdk?.stream || {}) as kinesis.StreamProps;
      this.cdk.stream = new kinesis.Stream(this, "Stream", {
        streamName: app.logicalPrefixedName(id),
        ...kinesisStreamProps,
      });
    }
  }

  private addConsumer(
    scope: Construct,
    consumerName: string,
    consumer: FunctionInlineDefinition | KinesisStreamConsumerProps
  ): Fn {
    // normalize consumer
    let consumerFunction, consumerProps;
    if ((consumer as KinesisStreamConsumerProps).function) {
      consumer = consumer as KinesisStreamConsumerProps;
      consumerFunction = consumer.function;
      consumerProps = consumer.cdk?.eventSource;
    } else {
      consumerFunction = consumer as FunctionInlineDefinition;
    }
    consumerProps = {
      startingPosition: lambda.StartingPosition.LATEST,
      ...(consumerProps || {}),
    };

    // create function
    const fn = Fn.fromDefinition(
      scope,
      `Consumer_${this.node.id}_${consumerName}`,
      consumerFunction,
      this.props.defaults?.function,
      `The "defaults.function" cannot be applied if an instance of a Function construct is passed in. Make sure to define all the consumers using FunctionProps, so the KinesisStream construct can apply the "defaults.function" to them.`
    );
    this.functions[consumerName] = fn;

    // create event source
    const eventSource = new lambdaEventSources.KinesisEventSource(
      this.cdk.stream,
      consumerProps
    );
    fn.addEventSource(eventSource);

    // attach permissions
    this.permissionsAttachedForAllConsumers.forEach((permissions) => {
      fn.attachPermissions(permissions);
    });
    fn.bind(this.bindingForAllConsumers);

    return fn;
  }
}
