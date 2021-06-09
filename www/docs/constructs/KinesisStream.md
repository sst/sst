---
description: "Docs for the sst.KinesisStream construct in the @serverless-stack/resources package. This construct creates a Kinesis stream."
---

The `KinesisStream` construct is a higher level CDK construct that makes it easy to create a [Kinesis Data Stream](https://aws.amazon.com/kinesis/data-streams/). You can create a stream and add a list of consumers to it.

This construct makes it easy to define a stream and its consumers. It also internally connects the consumers and the stream together.

## Initializer

```ts
new KinesisStream(scope: Construct, id: string, props: KinesisStreamProps)
```

_Parameters_

- scope [`Construct`](https://docs.aws.amazon.com/cdk/api/latest/docs/constructs.Construct.html)
- id `string`
- props [`KinesisStreamProps`](#kinesisstreamprops)

## Examples

### Using the minimal config

```js
import { KinesisStream } from "@serverless-stack/resources";

new KinesisStream(this, "Stream", {
  consumers: {
    consumer1: "src/consumer1.main",
    consumer2: "src/consumer2.main",
  }
});
```

### Adding consumers

Add consumers after the stream has been created.

```js {8-10}
const stream = new KinesisStream(this, "Stream", {
  consumers: {
    consumer1: "src/consumer1.main",
    consumer2: "src/consumer2.main",
  }
});

stream.addConsumers(this, {
  consumer3: "src/consumer3.main",
});
```

### Lazily adding consumers

Create an _empty_ stream and lazily add the consumers.

```js {3-6}
const stream = new KinesisStream(this, "Stream");

stream.addConsumers(this, {
  consumer1: "src/consumer1.main",
  consumer2: "src/consumer2.main",
});
```

### Specifying function props for all the consumers

You can extend the minimal config, to set some function props and have them apply to all the consumers.

```js {2-6}
new KinesisStream(this, "Stream", {
  defaultFunctionProps: {
    timeout: 20,
    environment: { tableName: table.tableName },
    permissions: [table],
  },
  consumers: {
    consumer1: "src/consumer1.main",
    consumer2: "src/consumer2.main",
  }
});
```

### Using the full config

If you wanted to configure each Lambda function separately, you can pass in the [`KinesisStreamConsumerProps`](#kinesisstreamconsumerprops).

```js
new KinesisStream(this, "Stream", {
  consumers: {
    consumer1: {
      function: {
        handler: "src/consumer1.main",
        timeout: 10,
        environment: { tableName: table.tableName },
        permissions: [table],
      },
    }
  },
});
```

Note that, you can set the `defaultFunctionProps` while using the `function` per consumer. The `function` will just override the `defaultFunctionProps`. Except for the `environment`, the `layers`, and the `permissions` properties, that will be merged.

```js
new KinesisStream(this, "Stream", {
  defaultFunctionProps: {
    timeout: 20,
    environment: { tableName: table.tableName },
    permissions: [table],
  },
  consumers: {
    consumer1: {
      function: {
        handler: "src/consumer1.main",
        timeout: 10,
        environment: { bucketName: bucket.bucketName },
        permissions: [bucket],
      },
    },
    consumer2: "src/consumer2.main",
  },
});
```

So in the above example, the `consumer1` function doesn't use the `timeout` that is set in the `defaultFunctionProps`. It'll instead use the one that is defined in the function definition (`10 seconds`). And the function will have both the `tableName` and the `bucketName` environment variables set; as well as permissions to both the `table` and the `bucket`.

### Giving the consumers some permissions

Allow the consumer functions to access S3.

```js {8}
const stream = new KinesisStream(this, "Stream", {
  consumers: {
    consumer1: "src/consumer1.main",
    consumer2: "src/consumer2.main",
  }
});

stream.attachPermissions(["s3"]);
```

### Giving a specific consumers some permissions

Allow a specific consumer function to access S3.

```js {8}
const stream = new KinesisStream(this, "Stream", {
  consumers: {
    consumer1: "src/consumer1.main",
    consumer2: "src/consumer2.main",
  }
});

stream.attachPermissionsToConsumer("consumer1", ["s3"]);
```

### Configuring the Kinesis stream

Configure the internally created CDK `Stream` instance.

```js {6-8}
new KinesisStream(this, "Stream", {
  consumers: {
    consumer1: "src/consumer1.main",
    consumer2: "src/consumer2.main",
  }
  kinesisStream: {
    shardCount: 3,
  },
});
```

### Configuring a consumer

Configure the internally created CDK Event Source.

```js {5-10}
import { StartingPosition } from "@aws-cdk/aws-lambda";

new KinesisStream(this, "Stream", {
  consumers: {
    consumer1: {
      function: "src/consumer1.main",
      consumerProps: {
        startingPosition: StartingPosition.LATEST,
      },
    },
  }
});
```

### Importing an existing stream

Override the internally created CDK `Stream` instance.

```js {4}
import { Stream } from "@aws-cdk/aws-kinesis";

new KinesisStream(this, "Stream", {
  kinesisStream: Stream.fromStreamArn(this, "ImportedStream", streamArn),
});
```

## Properties

An instance of `KinesisStream` contains the following properties.

### streamArn

_Type_: `string`

The ARN of the internally created CDK `Stream` instance.

### streamName

_Type_: `string`

The name of the internally created CDK `Stream` instance.

### kinesisStream

_Type_ : [`cdk.aws-kinesis.Stream`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-kinesis.Stream.html)

The internally created CDK `Stream` instance.

## Methods

An instance of `KinesisStream` contains the following methods.

### getFunction

```ts
getFunction(consumerName: string): Function
```

_Parameters_

- **consumerName** `string`

_Returns_

- [`Function`](Function.md)

Get the instance of the internally created [`Function`](Function.md), for a given consumer. Where the `consumerName` is the name used to define a consumer.

### addConsumers

```ts
addConsumers(scope: cdk.Construct, consumers: { [consumerName: string]: FunctionDefinition | KinesisStreamConsumerProps })
```

_Parameters_

- **scope** `cdk.Construct`
- **consumers** `{ [consumerName: string]: FunctionDefinition | KinesisStreamConsumerProps }`

An associative array with the consumer name being a string and the value is either a [`FunctionDefinition`](Function.md#functiondefinition) or the [`KinesisStreamConsumerProps`](#kinesisstreamconsumerprops).

### attachPermissions

```ts
attachPermissions(permissions: Permissions)
```

_Parameters_

- **permissions** [`Permissions`](../util/Permissions.md#permissions)

Attaches the given list of [permissions](../util/Permissions.md#permissions) to all the consumer functions. This allows the consumers to access other AWS resources.

Internally calls [`Function.attachPermissions`](Function.md#attachpermissions).

### attachPermissionsToConsumer

```ts
attachPermissionsToConsumer(consumerName: string, permissions: Permissions)
```

_Parameters_

- **consumerName** `string`

- **permissions** [`Permissions`](../util/Permissions.md#permissions)

Attaches the given list of [permissions](../util/Permissions.md#permissions) to a specific consumer. This allows that function to access other AWS resources.

Internally calls [`Function.attachPermissions`](Function.md#attachpermissions).

## KinesisStreamProps

### consumers?

_Type_ : `{ [consumerName: string]: FunctionDefinition | KinesisStreamConsumerProps }`, _defaults to_ `{}`

The consumers for this stream. Takes an associative array, with the consumer name being a string and the value is either a [`FunctionDefinition`](Function.md#functiondefinition) or the [`KinesisStreamConsumerProps`](#kinesisstreamconsumerprops).

:::caution
You should not change the name of a consumer.
:::

Note, if the `consumerName` is changed, CloudFormation will remove the existing consumer and create a new one. If the starting point is set to `TRIM_HORIZON`, all the historical records available in the stream will be resent to the new consumer.

### kinesisStream?

_Type_ : `cdk.aws-kinesis.Stream | cdk.aws-kinesis.StreamProps`, _defaults to_ `undefined`

Or optionally pass in a CDK [`cdk.aws-kinesis.StreamProps`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-kinesis.StreamProps.html) instance or a [`cdk.aws-kinesis.Stream`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-kinesis.Stream.html) instance. This allows you to override the default settings this construct uses internally to create the stream.

### defaultFunctionProps?

_Type_ : [`FunctionProps`](Function.md#functionprops), _defaults to_ `{}`

The default function props to be applied to all the Lambda functions in the Stream. If the `function` is specified for a consumer, these default values are overridden. Except for the `environment`, the `layers`, and the `permissions` properties, that will be merged.

## KinesisStreamConsumerProps

### function

_Type_ : `FunctionDefinition`

A [`FunctionDefinition`](Function.md#functiondefinition) object that'll be used to create the consumer function for the stream.

### consumerProps?

_Type_ : [`cdk.aws-lambda-event-sources.lambdaEventSources.KinesisEventSourceProps`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-lambda-event-sources.KinesisEventSourceProps.html), _defaults to_ `KinesisEventSourceProps` with starting point set to `LATEST`.

Or optionally pass in a CDK `KinesisEventSourceProps`. This allows you to override the default settings this construct uses internally to create the consumer.
