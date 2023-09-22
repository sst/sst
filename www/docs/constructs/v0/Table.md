---
description: "Docs for the sst.Table construct in the @serverless-stack/resources package. This construct creates a DynamoDB table, and enable DynamoDB Streams and Kinesis Data Streams."
---

:::caution
This is the SST v0.x Constructs doc. SST v1 is now released. If you are using v1, see the [v1 Constructs doc](/constructs). If you are looking to upgrade to v1, [check out the migration steps](/constructs/v0/migration).
:::

The `Table` construct is a higher level CDK construct that makes it easy to create a [DynamoDB](https://aws.amazon.com/dynamodb/) table. It uses the following defaults:

- Defaults to using the [On-Demand capacity](https://aws.amazon.com/dynamodb/pricing/on-demand/) to make it perfectly serverless.
- Enables [Point-in-Time Recovery](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/PointInTimeRecovery.html) to make sure that you don't lose your data.
- Provides a nicer interface for defining indexes.

## Initializer

```ts
new Table(scope: Construct, id: string, props: TableProps)
```

_Parameters_

- scope [`Construct`](https://docs.aws.amazon.com/cdk/api/v2/docs/constructs.Construct.html)
- id `string`
- props [`TableProps`](#tableprops)

## Examples

### Specifying just the primary index

```js
import { Table, TableFieldType } from "@serverless-stack/resources";

new Table(this, "Notes", {
  fields: {
    userId: TableFieldType.STRING,
    noteId: TableFieldType.STRING,
  },
  primaryIndex: { partitionKey: "noteId", sortKey: "userId" },
});
```

### Adding global indexes

```js
new Table(this, "Notes", {
  fields: {
    userId: TableFieldType.STRING,
    noteId: TableFieldType.STRING,
    time: TableFieldType.NUMBER,
  },
  primaryIndex: { partitionKey: "noteId", sortKey: "userId" },
  globalIndexes: {
    userTimeIndex: { partitionKey: "userId", sortKey: "time" },
  },
});
```

### Adding local indexes

```js
new Table(this, "Notes", {
  fields: {
    userId: TableFieldType.STRING,
    noteId: TableFieldType.STRING,
    time: TableFieldType.NUMBER,
  },
  primaryIndex: { partitionKey: "noteId", sortKey: "userId" },
  localIndexes: {
    userTimeIndex: { sortKey: "time" },
  },
});
```

### Configuring an index

Configure the internally created CDK `GlobalSecondaryIndex`.

```js {10-18}
import { ProjectionType } from "aws-cdk-lib/aws-dynamodb";

new Table(this, "Table", {
  fields: {
    userId: TableFieldType.STRING,
    noteId: TableFieldType.STRING,
    time: TableFieldType.NUMBER,
  },
  primaryIndex: { partitionKey: "noteId", sortKey: "userId" },
  globalIndexes: {
    userTimeIndex: {
      partitionKey: "userId",
      sortKey: "time",
      indexProps: {
        projectionType: ProjectionType.KEYS_ONLY,
      },
    },
  },
});
```

### Enabling DynamoDB Streams

#### Using the minimal config

Enable DynamoDB Streams and add consumers.

```js {6-10}
const table = new Table(this, "Notes", {
  fields: {
    noteId: TableFieldType.STRING,
  },
  primaryIndex: { partitionKey: "noteId" },
  stream: true,
  consumers: {
    consumer1: "src/consumer1.main",
    consumer2: "src/consumer2.main",
  },
});
```

#### Lazily adding consumers

Lazily add the consumers after the table has been defined.

```js {9-12}
const table = new Table(this, "Notes", {
  fields: {
    noteId: TableFieldType.STRING,
  },
  primaryIndex: { partitionKey: "noteId" },
  stream: true,
});

table.addConsumers(this, {
  consumer1: "src/consumer1.main",
  consumer2: "src/consumer2.main",
});
```

#### Specifying function props for all the consumers

You can extend the minimal config, to set some function props and have them apply to all the consumers.

```js {2-6}
new Table(this, "Notes", {
  defaultFunctionProps: {
    timeout: 20,
    environment: { topicName: topic.topicName },
    permissions: [topic],
  },
  stream: true,
  consumers: {
    consumer1: "src/consumer1.main",
    consumer2: "src/consumer2.main",
  }
});
```

#### Using the full config

If you wanted to configure each Lambda function separately, you can pass in the [`TableConsumerProps`](#tableconsumerprops).

```js
new Table(this, "Notes", {
  stream: true,
  consumers: {
    consumer1: {
      function: {
        handler: "src/consumer1.main",
        timeout: 10,
        environment: { topicName: topic.topicName },
        permissions: [topic],
      },
    }
  },
});
```

Note that, you can set the `defaultFunctionProps` while using the `function` per consumer. The `function` will just override the `defaultFunctionProps`. Except for the `environment`, the `layers`, and the `permissions` properties, that will be merged.

```js
new Table(this, "Notes", {
  defaultFunctionProps: {
    timeout: 20,
    environment: { topicName: topic.topicName },
    permissions: [topic],
  },
  stream: true,
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

So in the above example, the `consumer1` function doesn't use the `timeout` that is set in the `defaultFunctionProps`. It'll instead use the one that is defined in the function definition (`10 seconds`). And the function will have both the `topicName` and the `bucketName` environment variables set; as well as permissions to both the `topic` and the `bucket`.

#### Giving the consumers permissions

Allow the consumer functions to access S3.

```js {13}
const table = new Table(this, "Notes", {
  fields: {
    noteId: TableFieldType.STRING,
  },
  primaryIndex: { partitionKey: "noteId" },
  stream: true,
  consumers: {
    consumer1: "src/consumer1.main",
    consumer2: "src/consumer2.main",
  },
});

table.attachPermissions(["s3"]);
```

#### Giving a specific consumer permissions

Allow the first consumer function to access S3.

```js {13}
const table = new Table(this, "Notes", {
  fields: {
    noteId: TableFieldType.STRING,
  },
  primaryIndex: { partitionKey: "noteId" },
  stream: true,
  consumers: {
    consumer1: "src/consumer1.main",
    consumer2: "src/consumer2.main",
  },
});

table.attachPermissionsToConsumer("consumer1", ["s3"]);
```

#### Configuring the Stream content

Configure the information that will be written to the Stream.

```js {8}
import { StreamViewType } from "aws-cdk-lib/aws-dynamodb";

new Table(this, "Notes", {
  fields: {
    noteId: TableFieldType.STRING,
  },
  primaryIndex: { partitionKey: "noteId" },
  stream: StreamViewType.NEW_IMAGE,
  consumers: {
    consumer1: "src/consumer1.main",
    consumer2: "src/consumer2.main",
  },
});
```

#### Configuring a consumer

Configure the internally created CDK Event Source.

```js {10-15}
import { StartingPosition } from "aws-cdk-lib/aws-lambda";

new Table(this, "Notes", {
  fields: {
    noteId: TableFieldType.STRING,
  },
  primaryIndex: { partitionKey: "noteId" },
  stream: true,
  consumers: {
    consumer1: {
      function: "src/consumer1.main",
      consumerProps: {
        startingPosition: StartingPosition.TRIM_HORIZON,
      },
    },
  },
});
```

### Enabling Kinesis Streams

```js {10}
import { KinesisStream } from "@serverless-stack/resources";

const stream = new KinesisStream(this, "Stream");

const table = new Table(this, "Notes", {
  fields: {
    noteId: TableFieldType.STRING,
  },
  primaryIndex: { partitionKey: "noteId" },
  kinesisStream: stream,
});
```

Note, you do not need to configure the `stream` and `consumers` fields when enabling the Kinesis Streams. The `stream` field is used to configure DynamoDB Streams, and the `consumers` are only triggered by DynamoDB Streams.

You can read more about configuring `consumers` for the Kinesis Stream in the [`KinesisStream`](KinesisStream.md) doc.

### Importing an existing table

Override the internally created CDK `Table` instance.

```js {4}
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";

new Table(this, "Table", {
  dynamodbTable: dynamodb.Table.fromTableArn(this, "ImportedTable", tableArn),
});
```

### Upgrading to v0.21.0

The [v0.21.0 release](https://github.com/sst/sst/releases/tag/v0.21.1) of the Table construct includes a small breaking change. You might be impacted by this change if:

- You are currently using any version `< v0.21.0`
- And using consumers with table Streams enabled

#### Using `consumers`

If you are configuring the `consumers` like so:

```js
new Table(this, "Table", {
  consumers: [
    "src/consumerA.main",
    "src/consumerB.main",
  ],
});
```

Change it to:

```js
import { StartingPosition } from "aws-cdk-lib/aws-lambda";

new Table(this, "Table", {
  consumers: {
    Consumer_0: {
      function: "src/consumerA.main",
      consumerProps: {
        startingPosition: StartingPosition.TRIM_HORIZON,
      },
    },
    Consumer_1: {
      function: "src/consumerB.main",
      consumerProps: {
        startingPosition: StartingPosition.TRIM_HORIZON,
      },
    }
  },
});
```

Note it is important to name the first consumer `Consumer_0`; the second consumer `Consumer_1`; and so on. This is to ensure CloudFormation recognizes them as the same consumers as before. Otherwise, CloudFormation will remove existing consumers and create new ones.

Also note the default starting position for the consumer has changed from `TRIM_HORIZON` to `LATEST`. Make sure to set the `startingPosition` in `consumerProps` if the default value was used before.

#### Using `addConsumers`

If you are making the `addConsumers` call like this:

```js
table.addConsumers(this, [
  "src/consumer1.main",
  "src/consumer2.main",
]);
```

Change it to:

```js
import * as cognito from "aws-cdk-lib/aws-cognito";

table.addConsumers(this, {
  Consumer_0: {
    function: "src/consumerA.main",
    consumerProps: {
      startingPosition: StartingPosition.TRIM_HORIZON,
    },
  },
  Consumer_1: {
    function: "src/consumerB.main",
    consumerProps: {
      startingPosition: StartingPosition.TRIM_HORIZON,
    },
  }
});
```

Read more about the [`TableConsumerProps.consumers`](#consumers) below.

### Advanced examples

#### Configuring the DynamoDB table

Configure the internally created CDK `Table` instance.

```js {9-11}
import { RemovalPolicy } from "aws-cdk-lib";

new Table(this, "Table", {
  fields: {
    userId: TableFieldType.STRING,
    noteId: TableFieldType.STRING,
  },
  primaryIndex: { partitionKey: "noteId", sortKey: "userId" },
  dynamodbTable: {
    removalPolicy: RemovalPolicy.DESTROY,
  },
});
```

#### Enabling Global Tables

```js {8-11}
import { Duration } from "aws-cdk-lib";

const table = new Table(this, "Notes", {
  fields: {
    noteId: TableFieldType.STRING,
  },
  primaryIndex: { partitionKey: "noteId" },
  dynamodbTable: {
    replicationRegions: ['us-east-1', 'us-east-2', 'us-west-2'],
    replicationTimeout: Duration.hours(2),
  },
});
```

## Properties

An instance of `Table` contains the following properties.

### tableArn

_Type_: `string`

The ARN of the internally created CDK `Table` instance.

### tableName

_Type_: `string`

The name of the internally created CDK `Table` instance.

### dynamodbTable

_Type_ : [`cdk.aws-dynamodb.Table`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_dynamodb.Table.html)

The internally created CDK `Table` instance.

## Methods

An instance of `Table` contains the following methods.

### getFunction

```ts
getFunction(consumerName: string): Function
```

_Parameters_

- **consumerName** `string`

_Returns_

- [`Function`](Function.md)

Get the instance of the internally created [`Function`](Function.md), for a given consumer. Where the `consumerName` is the name used to define a consumer.

### addGlobalIndexes

```ts
addGlobalIndexes(indexes: { [key: string]: TableIndexProps })
```

_Parameters_

- **indexes** `{ [key: string]: TableIndexProps }`

Takes an associative array of a list of global secondary indexes, where the `key` is the name of the global secondary index and the value is using the [`TableGlobalIndexProps`](#tableindexprops) type.

### addLocalIndexes

```ts
addLocalIndexes(indexes: { [key: string]: TableLocalIndexProps})
```

_Parameters_

- **indexes** `{ [key: string]: TableLocalIndexProps}`

Takes an associative array of a list of local secondary indexes, where the `key` is the name of the local secondary index and the value is using the [`TableLocalIndexProps`](#tableindexprops) type.

### addConsumers

```ts
addConsumers(scope: cdk.Construct, consumers: { [consumerName: string]: FunctionDefinition | TableConsumerProps })
```

_Parameters_

- **scope** `cdk.Construct`
- **consumers** `{ [consumerName: string]: FunctionDefinition | TableConsumerProps }`

An associative array with the consumer name being a string and the value is either a [`FunctionDefinition`](Function.md#functiondefinition) or the [`TableConsumerProps`](#tableconsumerprops).

### attachPermissions

```ts
attachPermissions(permissions: Permissions)
```

_Parameters_

- **permissions** [`Permissions`](./Permissions)

Attaches the given list of [permissions](./Permissions) to all the `consumerFunctions`. This allows the consumers to access other AWS resources.

Internally calls [`Function.attachPermissions`](Function.md#attachpermissions).

### attachPermissionsToConsumer

```ts
attachPermissions(consumerName: string, permissions: Permissions)
```

_Parameters_

- **consumerName** `string`

- **permissions** [`Permissions`](./Permissions)

Attaches the given list of [permissions](./Permissions) to a specific function in the list of `consumerFunctions`. This allows that consumer to access other AWS resources.

Internally calls [`Function.attachPermissions`](Function.md#attachpermissions).

## TableProps

### fields

_Type_ : `{ [key: string]: TableFieldType }`

An associative array with the list of fields of the table. Where `key` is the name of the field and the value is one of [`TableFieldType`](#tablefieldtype).

### primaryIndex

_Type_ : `TableIndexProps`

Define the primary index for the table using the [`TableIndexProps`](#tableindexprops) type.

### globalIndexes?

_Type_ : `{ [key: string]: TableIndexProps }`, _defaults to_ `{}`

An associative array of a list of global secondary indexes, where the `key` is the name of the global secondary index and the value is using the [`TableGlobalIndexProps`](#tableindexprops) type.

### localIndexes?

_Type_ : `{ [key: string]: TableLocalIndexProps }`, _defaults to_ `{}`

An associative array of a list of local secondary indexes, where the `key` is the name of the local secondary index and the value is using the [`TableLocalIndexProps`](#tableindexprops) type.

### secondaryIndexes? (deprecated)

`secondaryIndexes` has been renamed to `globalIndexes` in v0.46.0

If you are configuring the `secondaryIndexes` like so:
```js {3}
new Table(this, "Table", {
  ...
  secondaryIndexes: {
    userTimeIndex: { partitionKey: "userId", sortKey: "time" },
  },
}
```

Change it to:
```js {3}
new Table(this, "Table", {
  ...
  globalIndexes: {
    userTimeIndex: { partitionKey: "userId", sortKey: "time" },
  },
}
```

### stream?

_Type_ : `boolean | cdk.aws-dynamodb.StreamViewType`, defaults to `false`

DynamoDB Streams for the table. Takes a `boolean` or a [`cdk.aws-dynamodb.StreamViewType`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_dynamodb.StreamViewType.html).

If `stream` is set to `true`, the Stream is enabled with `NEW_AND_OLD_IMAGES`.

### consumers?

_Type_ : `{ [consumerName: string]: FunctionDefinition | TableConsumerProps }`, _defaults to_ `{}`

The consumers for this Stream. Takes an associative array, with the consumer name being a string and the value is either a [`FunctionDefinition`](Function.md#functiondefinition) or the [`TableConsumerProps`](#tableconsumerprops).

:::caution
You should not change the name of a consumer.
:::

Note, if the `consumerName` is changed, CloudFormation will remove the existing consumer and create a new one. If the starting point is set to `TRIM_HORIZON`, all the historical records available in the Stream will be resent to the new consumer.

### kinesisStream?

_Type_ : [`KinesisStream`](KinesisStream.md), _defaults to Kinesis Stream disabled_

The Kinesis Stream for DynamoDB to Stream item-level changes in your table to.

### dynamodbTable?

_Type_ : `cdk.aws-dynamodb.Table | TableCdkProps`, _defaults to_ `undefined`

Or optionally pass in a CDK [`cdk.aws-dynamodb.Table`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_dynamodb.Table.html) instance or [`TableCdkProps`](#tablecdkprops). This allows you to override the default settings this construct uses internally to create the table.

### defaultFunctionProps?

_Type_ : [`FunctionProps`](Function.md#functionprops), _defaults to_ `{}`

The default function props to be applied to all the Lambda functions in the Table. If the `function` is specified for a consumer, these default values are overridden. Except for the `environment`, the `layers`, and the `permissions` properties, that will be merged.

## TableIndexProps

Used to define an index.

### partitionKey

_Type_: `string`

The field that's to be used as a partition key for the index.

### sortKey?

_Type_: `string`, _defaults to_ `undefined`

The field that's to be used as the sort key for the index.

### indexProps?

_Type_: [`TableCdkIndexProps`](#tablecdkindexprops), _defaults to_ `undefined`

Or optionally pass in `TableCdkIndexProps`. This allows you to override the default settings this construct uses internally to create the index.


## TableLocalIndexProps

Used to define a local index.

### sortKey?

_Type_: `string`, _defaults to_ `undefined`

The field that's to be used as the sort key for the index.

### indexProps?
_Type_:
```typescript
{
  nonKeyAttributes?: string[],
  projectionType: dynamodb.ProjectionType
}
```
_defaults to_ `undefined`

This allows you to override the default settings this construct uses internally to create the index.


## TableConsumerProps

### function

_Type_ : `FunctionDefinition`

A [`FunctionDefinition`](Function.md#functiondefinition) object that'll be used to create the consumer function for the table.

### consumerProps?

_Type_ : [`cdk.aws-lambda-event-sources.lambdaEventSources.DynamoEventSourceProps`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_lambda_event_sources.DynamoEventSourceProps.html), _defaults to_ `DynamoEventSourceProps` with starting point set to `LATEST`.

Or optionally pass in a CDK `DynamoEventSourceProps`. This allows you to override the default settings this construct uses internally to create the consumer.

## TableCdkProps

`TableCdkProps` extends [`cdk.aws-dynamodb.TableProps`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_dynamodb.TableProps.html) with the exception that the `partitionKey` and `sortKey` fields are **not accepted**. The parition key and the sort key should be configured using the [`primaryIndex`](#primaryindex) field.

You can use `TableCdkProps` to configure all the other table properties.

## TableCdkIndexProps

`TableCdkIndexProps` extends [`cdk.aws-dynamodb.GlobalSecondaryIndexProps`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_dynamodb.GlobalSecondaryIndexProps.html) with the exception that the `indexName`, `partitionKey`, and the `sortKey` fields are **not accepted**. The index name, parition key, and the sort key should be configured using the [`globalIndexes`](#globalindexes) field.

You can use `TableCdkIndexProps` to configure the other index properties.

## TableFieldType

An enum with the following members representing the field types.

| Member | Description                                                                       |
| ------ | --------------------------------------------------------------------------------- |
| BINARY | Up to 400KB of binary data. Must be encoded as base64 before sending to DynamoDB. |
| NUMBER | Numeric values with a maximum of 38 digits. Can be positive, negative, or zero.   |
| STRING | Up to 400KB of UTF-8 encoded text.                                                |

For example, to set a field as string, use `sst.TableFieldType.STRING`.
