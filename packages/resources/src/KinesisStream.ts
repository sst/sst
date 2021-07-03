import * as cdk from "@aws-cdk/core";
import * as kinesis from "@aws-cdk/aws-kinesis";
import * as lambda from "@aws-cdk/aws-lambda";
import * as lambdaEventSources from "@aws-cdk/aws-lambda-event-sources";
import { App } from "./App";
import { Stack } from "./Stack";
import { ISstConstruct, ISstConstructInfo } from "./Construct";
import { Function as Fn, FunctionProps, FunctionDefinition } from "./Function";
import { Permissions } from "./util/permission";

/////////////////////
// Interfaces
/////////////////////

export interface KinesisStreamProps {
  readonly kinesisStream?: kinesis.IStream | kinesis.StreamProps;
  readonly consumers?: {
    [consumerName: string]: FunctionDefinition | KinesisStreamConsumerProps;
  };
  readonly defaultFunctionProps?: FunctionProps;
}

export interface KinesisStreamConsumerProps {
  readonly function: FunctionDefinition;
  readonly consumerProps?: lambdaEventSources.KinesisEventSourceProps;
}

/////////////////////
// Construct
/////////////////////

export class KinesisStream extends cdk.Construct implements ISstConstruct {
  public readonly kinesisStream: kinesis.IStream;
  private functions: { [consumerName: string]: Fn };
  private readonly permissionsAttachedForAllConsumers: Permissions[];
  private readonly defaultFunctionProps?: FunctionProps;

  constructor(scope: cdk.Construct, id: string, props?: KinesisStreamProps) {
    super(scope, id);

    const root = scope.node.root as App;
    const { kinesisStream, consumers, defaultFunctionProps } = props || {};
    this.functions = {};
    this.permissionsAttachedForAllConsumers = [];
    this.defaultFunctionProps = defaultFunctionProps;

    ////////////////////
    // Create Stream
    ////////////////////

    if (cdk.Construct.isConstruct(kinesisStream)) {
      this.kinesisStream = kinesisStream as kinesis.IStream;
    } else {
      const kinesisStreamProps = (kinesisStream || {}) as kinesis.StreamProps;
      this.kinesisStream = new kinesis.Stream(this, "Stream", {
        streamName: root.logicalPrefixedName(id),
        ...kinesisStreamProps,
      });
    }

    ///////////////////////////
    // Create Consumers
    ///////////////////////////

    if (consumers) {
      Object.keys(consumers).forEach((consumerName: string) =>
        this.addConsumer(this, consumerName, consumers[consumerName])
      );
    }

    ///////////////////
    // Register Construct
    ///////////////////
    root.registerConstruct(this);
  }

  public get streamArn(): string {
    return this.kinesisStream.streamArn;
  }

  public get streamName(): string {
    return this.kinesisStream.streamName;
  }

  public addConsumers(
    scope: cdk.Construct,
    consumers: {
      [consumerName: string]: FunctionDefinition | KinesisStreamConsumerProps;
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

  public getConstructInfo(): ISstConstructInfo {
    // imported
    if (!cdk.Token.isUnresolved(this.kinesisStream.streamName)) {
      return {
        streamName: this.kinesisStream.streamName,
      };
    }
    // created
    const cfn = this.kinesisStream.node.defaultChild as kinesis.CfnStream;
    return {
      streamLogicalId: Stack.of(this).getLogicalId(cfn),
    };
  }

  private addConsumer(
    scope: cdk.Construct,
    consumerName: string,
    consumer: FunctionDefinition | KinesisStreamConsumerProps
  ): Fn {
    // normalize consumer
    let consumerFunction, consumerProps;
    if ((consumer as KinesisStreamConsumerProps).function) {
      consumer = consumer as KinesisStreamConsumerProps;
      consumerFunction = consumer.function;
      consumerProps = consumer.consumerProps;
    } else {
      consumerFunction = consumer as FunctionDefinition;
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
      this.defaultFunctionProps,
      `The "defaultFunctionProps" cannot be applied if an instance of a Function construct is passed in. Make sure to define all the consumers using FunctionProps, so the KinesisStream construct can apply the "defaultFunctionProps" to them.`
    );
    this.functions[consumerName] = fn;

    // create event source
    const eventSource = new lambdaEventSources.KinesisEventSource(
      this.kinesisStream,
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
