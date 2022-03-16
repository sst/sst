import { Construct } from "constructs";
import * as kinesis from "aws-cdk-lib/aws-kinesis";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as lambdaEventSources from "aws-cdk-lib/aws-lambda-event-sources";
import { App } from "./App";
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

export interface KinesisStreamProps {
  defaults?: {
    function?: FunctionProps;
  };
  consumers?: {
    [consumerName: string]:
      | FunctionInlineDefinition
      | KinesisStreamConsumerProps;
  };
  cdk?: {
    stream?: kinesis.IStream | kinesis.StreamProps;
  };
}

export interface KinesisStreamConsumerProps {
  function: FunctionDefinition;
  cdk?: {
    eventSource?: lambdaEventSources.KinesisEventSourceProps;
  };
}

/////////////////////
// Construct
/////////////////////

export class KinesisStream extends Construct implements SSTConstruct {
  public readonly cdk: {
    stream: kinesis.IStream;
  };
  private functions: { [consumerName: string]: Fn };
  private readonly permissionsAttachedForAllConsumers: Permissions[];
  private readonly props: KinesisStreamProps;

  constructor(scope: Construct, id: string, props?: KinesisStreamProps) {
    super(scope, id);

    this.props = props || {};
    this.cdk = {} as any;
    this.functions = {};
    this.permissionsAttachedForAllConsumers = [];

    this.createStream();

    // Create Consumers
    if (props?.consumers) {
      for (const consumerName in props.consumers) {
        this.addConsumer(this, consumerName, props.consumers[consumerName]);
      }
    }
  }

  public get streamArn(): string {
    return this.cdk.stream.streamArn;
  }

  public get streamName(): string {
    return this.cdk.stream.streamName;
  }

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

  public attachPermissions(permissions: Permissions): void {
    Object.values(this.functions).forEach((fn) =>
      fn.attachPermissions(permissions)
    );
    this.permissionsAttachedForAllConsumers.push(permissions);
  }

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
      consumerName,
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

    return fn;
  }
}
