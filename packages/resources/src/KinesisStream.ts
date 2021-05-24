import * as cdk from "@aws-cdk/core";
import * as kinesis from "@aws-cdk/aws-kinesis";
import * as lambda from "@aws-cdk/aws-lambda";
import * as lambdaEventSources from "@aws-cdk/aws-lambda-event-sources";
import { App } from "./App";
import { Function as Fn, FunctionProps, FunctionDefinition } from "./Function";
import { Permissions } from "./util/permission";

/////////////////////
// Interfaces
/////////////////////

export interface KinesisStreamProps {
  readonly kinesisStream?: kinesis.IStream | kinesis.StreamProps;
  readonly consumers?: { [key: string]: FunctionDefinition | KinesisStreamConsumerProps };
  readonly defaultFunctionProps?: FunctionProps;
}

export interface KinesisStreamConsumerProps {
  readonly function: FunctionDefinition;
  readonly consumerProps?: lambdaEventSources.KinesisEventSourceProps;
}

/////////////////////
// Construct
/////////////////////

export class KinesisStream extends cdk.Construct {
  public readonly kinesisStream: kinesis.IStream;
  public functions: { [key:string]: Fn };
  private readonly permissionsAttachedForAllConsumers: Permissions[];
  private readonly defaultFunctionProps?: FunctionProps;

  constructor(scope: cdk.Construct, id: string, props?: KinesisStreamProps) {
    super(scope, id);

    const root = scope.node.root as App;
    const {
      kinesisStream,
      consumers,
      defaultFunctionProps,
    } = props || {};
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
      Object.keys(consumers).forEach((key: string) =>
        this.addConsumer(this, key, consumers[key])
      );
    }
  }

  public addConsumers(
    scope: cdk.Construct,
    consumers: {
      [key: string]: FunctionDefinition | KinesisStreamConsumerProps
    }
  ): void {
    Object.keys(consumers).forEach((key: string) => {
      this.addConsumer(scope, key, consumers[key]);
    });
  }

  public attachPermissions(permissions: Permissions): void {
    Object.values(this.functions).forEach((fn) =>
      fn.attachPermissions(permissions)
    );
    this.permissionsAttachedForAllConsumers.push(permissions);
  }

  public attachPermissionsToConsumer(
    key: string,
    permissions: Permissions
  ): void {
    this.functions[key].attachPermissions(permissions);
  }

  public getFunction(key: string): Fn | undefined {
    return this.functions[key];
  }

  private addConsumer(
    scope: cdk.Construct,
    key: string,
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
      ...consumerProps || {},
    };

    // create function
    const fn = Fn.fromDefinition(
      scope,
      key,
      consumerFunction,
      this.defaultFunctionProps,
      `The "defaultFunctionProps" cannot be applied if an instance of a Function construct is passed in. Make sure to define all the consumers using FunctionProps, so the KinesisStream construct can apply the "defaultFunctionProps" to them.`
    );
    this.functions[key] = fn;

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
