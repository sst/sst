---
description: "Docs for the sst.Table construct in the @serverless-stack/resources package"
---
The `Table` construct is a higher level CDK construct that makes it easy to create a [DynamoDB](https://aws.amazon.com/dynamodb/) table. It uses the following defaults:

- Defaults to using the [On-Demand capacity](https://aws.amazon.com/dynamodb/pricing/on-demand/) to make it perfectly serverless.
- Enables [Point-in-Time Recovery](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/PointInTimeRecovery.html) to make sure that you don't lose your data.
- Provides a nicer interface for defining indexes.


## Constructor
```ts
new Table(scope: Construct, id: string, props: TableProps)
```
_Parameters_
- __scope__ [`Construct`](https://docs.aws.amazon.com/cdk/api/v2/docs/constructs.Construct.html)
- __id__ `string`
- __props__ [`TableProps`](#tableprops)
## Examples

### Lazily adding consumers

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


### Giving the consumers permissions

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


### Giving a specific consumer permissions

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


### Specifying function props for all the consumers

```js {3-7}
new Table(this, "Notes", {
  defaults: {
    function: {
      timeout: 20,
      environment: { topicName: topic.topicName },
      permissions: [topic],
    }
  },
  stream: true,
  consumers: {
    consumer1: "src/consumer1.main",
    consumer2: "src/consumer2.main",
  }
});
```



### Adding global indexes

```js
new Table(this, "Notes", {
  fields: {
    userId: "string",
    noteId: "string",
    time: "number",
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
    userId: "string",
    noteId: "string",
    time: "number",
  },
  primaryIndex: { partitionKey: "noteId", sortKey: "userId" },
  localIndexes: {
    userTimeIndex: { sortKey: "time" },
  },
});
```



### Specifying just the primary index

```js
import { Table } from "@serverless-stack/resources";

new Table(this, "Notes", {
  fields: {
    userId: "string",
    noteId: "string",
  },
  primaryIndex: { partitionKey: "noteId", sortKey: "userId" },
});
```


### Configuring the Stream content

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

## Properties
An instance of `Table` has the following properties.

### cdk.table

_Type_ : [`ITable`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.ITable.html)

The internally created CDK `Table` instance.


### tableArn

_Type_ : `string`

The ARN of the internally created CDK `Table` instance.

### tableName

_Type_ : `string`

The name of the internally created CDK `Table` instance.

## Methods
An instance of `Table` has the following methods.
### addConsumers

```ts
addConsumers(scope: Construct, consumers: unknown)
```
_Parameters_
- __scope__ [`Construct`](https://docs.aws.amazon.com/cdk/api/v2/docs/constructs.Construct.html)
- __consumers__ 



An object with the consumer name being a string and the value is either a FunctionDefinition or the TableConsumerProps.

### addGlobalIndexes

```ts
addGlobalIndexes(secondaryIndexes: Record)
```
_Parameters_
- __secondaryIndexes__ Record<`string`, [`TableGlobalIndexProps`](#tableglobalindexprops)>


Takes an object of a list of global secondary indexes, where the `key` is the name of the global secondary index and the value is using the [`TableGlobalIndexProps`](#tableindexprops) type.

### addLocalIndexes

```ts
addLocalIndexes(secondaryIndexes: Record)
```
_Parameters_
- __secondaryIndexes__ Record<`string`, [`TableLocalIndexProps`](#tablelocalindexprops)>


Takes an object of a list of local secondary indexes, where the `key` is the name of the local secondary index and the value is using the [`TableLocalIndexProps`](#tableindexprops) type.

### attachPermissions

```ts
attachPermissions(permissions: Permissions)
```
_Parameters_
- __permissions__ [`Permissions`](Permissions)


Grant permissions to all consumers of this table.

### attachPermissionsToConsumer

```ts
attachPermissionsToConsumer(consumerName: string, permissions: Permissions)
```
_Parameters_
- __consumerName__ `string`
- __permissions__ [`Permissions`](Permissions)


Grant permissions to a specific consumer of this table.

### getFunction

```ts
getFunction(consumerName: string)
```
_Parameters_
- __consumerName__ `string`


Get the instance of the internally created [`Function`](Function.md), for a given consumer. Where the `consumerName` is the name used to define a consumer.

## TableConsumerProps

### cdk.eventSource

_Type_ : [`DynamoEventSourceProps`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.DynamoEventSourceProps.html)


### function

_Type_ : [`FunctionDefinition`](FunctionDefinition)

Used to create the consumer function for the table.

## TableGlobalIndexProps

### cdk.index

_Type_ : Omit<[`GlobalSecondaryIndexProps`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.GlobalSecondaryIndexProps.html), `"partitionKey"`&nbsp; | &nbsp;`"sortKey"`&nbsp; | &nbsp;`"indexName"`>


### partitionKey

_Type_ : `string`

The field that's to be used as a partition key for the index.

### sortKey

_Type_ : `string`

The field that's to be used as the sort key for the index.

## TableLocalIndexProps

### cdk.index

_Type_ : Omit<[`LocalSecondaryIndexProps`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.LocalSecondaryIndexProps.html), `"sortKey"`&nbsp; | &nbsp;`"indexName"`>


### sortKey

_Type_ : `string`

The field that's to be used as the sort key for the index.

## TableProps

### cdk.table

_Type_ : [`ITable`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.ITable.html)&nbsp; | &nbsp;Omit<[`TableProps`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.TableProps.html), `"partitionKey"`&nbsp; | &nbsp;`"sortKey"`>





Configure DynamoDB streams and consumers


### defaults.function

_Type_ : [`FunctionProps`](FunctionProps)

Set some function props and have them apply to all the consumers.


### fields

_Type_ : Record<`string`, `"string"`&nbsp; | &nbsp;`"number"`&nbsp; | &nbsp;`"binary"`>

An object defining the fields of the table. Key is the name of the field and the value is the type

### globalIndexes

_Type_ : Record<`string`, [`TableGlobalIndexProps`](#tableglobalindexprops)>

Configure the table's global secondary indexes

### kinesisStream

_Type_ : [`KinesisStream`](KinesisStream)

### localIndexes

_Type_ : Record<`string`, [`TableLocalIndexProps`](#tablelocalindexprops)>

Configure the table's local secondary indexes


### primaryIndex.partitionKey

_Type_ : `string`

Partition key for the primary index

### primaryIndex.sortKey

_Type_ : `string`

Sort key for the primary index


Define the table's primary index

### stream

_Type_ : `boolean`&nbsp; | &nbsp;`"new_image"`&nbsp; | &nbsp;`"old_image"`&nbsp; | &nbsp;`"new_and_old_images"`&nbsp; | &nbsp;`"keys_only"`

Configure the information that will be written to the Stream.
