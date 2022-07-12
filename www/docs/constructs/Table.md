---
description: "Docs for the sst.Table construct in the @serverless-stack/resources package"
---
<!--
!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
!!                                                           !!
!!  This file has been automatically generated, do not edit  !!
!!                                                           !!
!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
-->
The `Table` construct is a higher level CDK construct that makes it easy to create a [DynamoDB](https://aws.amazon.com/dynamodb/) table. It uses the following defaults:

- Defaults to using the [On-Demand capacity](https://aws.amazon.com/dynamodb/pricing/on-demand/) to make it perfectly serverless.
- Enables [Point-in-Time Recovery](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/PointInTimeRecovery.html) to make sure that you don't lose your data.
- Provides a nicer interface for defining indexes.


## Constructor
```ts
new Table(scope, id, props)
```
_Parameters_
- __scope__ <span class="mono">[Construct](https://docs.aws.amazon.com/cdk/api/v2/docs/constructs.Construct.html)</span>
- __id__ <span class="mono">string</span>
- __props__ <span class="mono">[TableProps](#tableprops)</span>

### Primary index

```js
import { Table } from "@serverless-stack/resources";

new Table(stack, "Notes", {
  fields: {
    userId: "string",
    noteId: "string",
  },
  primaryIndex: { partitionKey: "noteId", sortKey: "userId" },
});
```

### Global indexes

```js
new Table(stack, "Notes", {
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

#### Configuring index projection

```js {12}
new Table(stack, "Table", {
  fields: {
    userId: "string",
    noteId: "string",
    time: "number",
  },
  primaryIndex: { partitionKey: "noteId", sortKey: "userId" },
  globalIndexes: {
    userTimeIndex: {
      partitionKey: "userId",
      sortKey: "time",
      projection: "keys_only",
    },
  },
});
```

### Local indexes

```js
new Table(stack, "Notes", {
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

### DynamoDB Streams

#### Using the minimal config

Enable DynamoDB Streams and add consumers.

```js {6-10}
new Table(stack, "Notes", {
  fields: {
    noteId: "string",
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
const table = new Table(stack, "Notes", {
  fields: {
    noteId: "string",
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

```js {3-7}
new Table(stack, "Notes", {
  defaults: {
    function: {
      timeout: 20,
      environment: { topicName: topic.topicName },
      permissions: [topic],
    },
  },
  stream: true,
  consumers: {
    consumer1: "src/consumer1.main",
    consumer2: "src/consumer2.main",
  }
});
```

#### Using the full config

Configure each Lambda function separately.

```js
new Table(stack, "Notes", {
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

Note that, you can set the `defaults.function` while using the `function` per consumer. The `function` will just override the `defaults.function`. Except for the `environment`, the `layers`, and the `permissions` properties, that will be merged.

```js
new Table(stack, "Notes", {
  defaults: {
    function: {
      timeout: 20,
      environment: { topicName: topic.topicName },
      permissions: [topic],
    },
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

So in the above example, the `consumer1` function doesn't use the `timeout` that is set in the `defaults.function`. It'll instead use the one that is defined in the function definition (`10 seconds`). And the function will have both the `topicName` and the `bucketName` environment variables set; as well as permissions to both the `topic` and the `bucket`.

#### Giving the consumers permissions

Allow the consumer functions to access S3.

```js {13}
const table = new Table(stack, "Notes", {
  fields: {
    noteId: "string",
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
const table = new Table(stack, "Notes", {
  fields: {
    noteId: "string",
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

```js {6}
new Table(stack, "Notes", {
  fields: {
    noteId: "string",
  },
  primaryIndex: { partitionKey: "noteId" },
  stream: "new_image",
  consumers: {
    consumer1: "src/consumer1.main",
    consumer2: "src/consumer2.main",
  },
});
```

#### Configuring a consumer

Configure the internally created CDK Event Source.

```js {13-15}
import { StartingPosition } from "aws-cdk-lib/aws-lambda";

new Table(stack, "Notes", {
  fields: {
    noteId: "string",
  },
  primaryIndex: { partitionKey: "noteId" },
  stream: true,
  consumers: {
    consumer1: {
      function: "src/consumer1.main",
      cdk: {
        eventSource: {
          startingPosition: StartingPosition.TRIM_HORIZON,
        },
      },
    },
  },
});
```

### Kinesis Streams

```js {10}
import { KinesisStream } from "@serverless-stack/resources";

const stream = new KinesisStream(this, "Stream");

new Table(stack, "Notes", {
  fields: {
    noteId: "string",
  },
  primaryIndex: { partitionKey: "noteId" },
  kinesisStream: stream,
});
```

Note, you do not need to configure the `stream` and `consumers` fields when enabling the Kinesis Streams. The `stream` field is used to configure DynamoDB Streams, and the `consumers` are only triggered by DynamoDB Streams.

You can read more about configuring `consumers` for the Kinesis Stream in the [`KinesisStream`](KinesisStream.md) doc.

### Advanced examples

#### Configuring the DynamoDB table

Configure the internally created CDK `Table` instance.

```js {10-12}
import { RemovalPolicy } from "aws-cdk-lib";

new Table(stack, "Table", {
  fields: {
    userId: "string",
    noteId: "string",
  },
  primaryIndex: { partitionKey: "noteId", sortKey: "userId" },
  cdk: {
    table: {
      removalPolicy: RemovalPolicy.DESTROY,
    },
  },
});
```

#### Importing an existing table

Override the internally created CDK `Table` instance.

```js {5}
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";

new Table(stack, "Table", {
  cdk: {
    table: dynamodb.Table.fromTableArn(this, "ImportedTable", tableArn),
  },
});
```

#### Enabling Global Tables

```js {9-12}
import { Duration } from "aws-cdk-lib";

const table = new Table(stack, "Notes", {
  fields: {
    noteId: "string",
  },
  primaryIndex: { partitionKey: "noteId" },
  cdk: {
    table: {
      replicationRegions: ['us-east-1', 'us-east-2', 'us-west-2'],
      replicationTimeout: Duration.hours(2),
    },
  },
});
```

## TableProps


### consumers?

_Type_ : <span class="mono">Record&lt;<span class="mono">string</span>, <span class='mono'><span class='mono'><span class="mono">string</span> | <span class="mono">[Function](Function#function)</span></span> | <span class="mono">[TableConsumerProps](#tableconsumerprops)</span></span>&gt;</span>

Configure DynamoDB streams and consumers



```js
const table = new Table(stack, "Table", {
  consumers: {
    consumer1: "src/consumer1.main",
    consumer2: "src/consumer2.main",
  },
});
```


### defaults.function?

_Type_ : <span class="mono">[FunctionProps](Function#functionprops)</span>

The default function props to be applied to all the consumers in the Table. The `environment`, `permissions` and `layers` properties will be merged with per route definitions if they are defined.



```js
new Table(stack, "Table", {
  defaults: {
    function: {
      timeout: 20,
      environment: { topicName: topic.topicName },
      permissions: [topic],
    }
  },
});
```


### fields?

_Type_ : <span class="mono">Record&lt;<span class="mono">string</span>, <span class='mono'><span class="mono">"string"</span> | <span class="mono">"number"</span> | <span class="mono">"binary"</span></span>&gt;</span>

An object defining the fields of the table. Key is the name of the field and the value is the type.


```js
new Table(stack, "Table", {
  fields: {
    pk: "string",
    sk: "string",
  }
})
```

### globalIndexes?

_Type_ : <span class="mono">Record&lt;<span class="mono">string</span>, <span class="mono">[TableGlobalIndexProps](#tableglobalindexprops)</span>&gt;</span>

Configure the table's global secondary indexes



```js
new Table(stack, "Table", {
  fields: {
    pk: "string",
    sk: "string",
    gsi1pk: "string",
    gsi1sk: "string",
  },
  globalIndexes: {
    "GSI1": { partitionKey: "gsi1pk", sortKey: "gsi1sk" },
  },
});
```

### kinesisStream?

_Type_ : <span class="mono">[KinesisStream](KinesisStream#kinesisstream)</span>

Configure the KinesisStream to capture item-level changes for the table.



```js
const stream = new Table(stack, "Stream");

new Table(stack, "Table", {
  kinesisStream: stream,
});
```

### localIndexes?

_Type_ : <span class="mono">Record&lt;<span class="mono">string</span>, <span class="mono">[TableLocalIndexProps](#tablelocalindexprops)</span>&gt;</span>

Configure the table's local secondary indexes



```js
new Table(stack, "Table", {
  fields: {
    pk: "string",
    sk: "string",
    lsi1sk: "string",
  },
  globalIndexes: {
    "lsi1": { sortKey: "lsi1sk" },
  },
});
```


### primaryIndex.partitionKey

_Type_ : <span class="mono">string</span>

Define the Partition Key for the table's primary index



```js
new Table(stack, "Table", {
  fields: {
    pk: "string",
  },
  primaryIndex: { partitionKey: "pk" },
});
```

### primaryIndex.sortKey?

_Type_ : <span class="mono">string</span>

Define the Sort Key for the table's primary index



```js
new Table(stack, "Table", {
  fields: {
    pk: "string",
    sk: "string",
  },
  primaryIndex: { partitionKey: "pk", sortKey: "sk" },
});
```


### stream?

_Type_ : <span class='mono'><span class="mono">boolean</span> | <span class="mono">"keys_only"</span> | <span class="mono">"new_image"</span> | <span class="mono">"old_image"</span> | <span class="mono">"new_and_old_images"</span></span>

Configure the information that will be written to the Stream.


```js {8}
new Table(stack, "Table", {
  stream: "new_image",
});
```

### timeToLiveAttribute?

_Type_ : <span class="mono">string</span>

The field that's used to store the expiration time for items in the table.


```js {8}
new Table(stack, "Table", {
  timeToLiveAttribute: "expireAt",
});
```


### cdk.table?

_Type_ : <span class='mono'><span class="mono">[ITable](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_dynamodb.ITable.html)</span> | <span class="mono">Omit&lt;<span class="mono">[TableProps](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_dynamodb.TableProps.html)</span>, <span class='mono'><span class="mono">"sortKey"</span> | <span class="mono">"partitionKey"</span></span>&gt;</span></span>

Override the settings of the internally created cdk table


## Properties
An instance of `Table` has the following properties.
### tableArn

_Type_ : <span class="mono">string</span>

The ARN of the internally created DynamoDB Table.

### tableName

_Type_ : <span class="mono">string</span>

The name of the internally created DynamoDB Table.


### cdk.table

_Type_ : <span class="mono">[ITable](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_dynamodb.ITable.html)</span>

The internally created CDK `Table` instance.


## Methods
An instance of `Table` has the following methods.
### addConsumers

```ts
addConsumers(scope, consumers)
```
_Parameters_
- __scope__ <span class="mono">[Construct](https://docs.aws.amazon.com/cdk/api/v2/docs/constructs.Construct.html)</span>
- __consumers__ 



Define additional consumers for table events


```js
table.addConsumers(stack, {
  consumer1: "src/consumer1.main",
  consumer2: "src/consumer2.main",
});
```

### addGlobalIndexes

```ts
addGlobalIndexes(secondaryIndexes)
```
_Parameters_
- __secondaryIndexes__ <span class="mono">Record&lt;<span class="mono">string</span>, <span class="mono">[TableGlobalIndexProps](#tableglobalindexprops)</span>&gt;</span>


Add additional global secondary indexes where the `key` is the name of the global secondary index


```js
table.addGlobalIndexes({
  gsi1: {
    partitionKey: "pk",
    sortKey: "sk",
  }
})
```

### addLocalIndexes

```ts
addLocalIndexes(secondaryIndexes)
```
_Parameters_
- __secondaryIndexes__ <span class="mono">Record&lt;<span class="mono">string</span>, <span class="mono">[TableLocalIndexProps](#tablelocalindexprops)</span>&gt;</span>


Add additional local secondary indexes where the `key` is the name of the local secondary index


```js
table.addLocalIndexes({
  lsi1: {
    sortKey: "sk",
  }
})
```

### attachPermissions

```ts
attachPermissions(permissions)
```
_Parameters_
- __permissions__ <span class="mono">[Permissions](Permissions)</span>


Grant permissions to all consumers of this table.


```js
table.attachPermissions(["s3"]);
```

### attachPermissionsToConsumer

```ts
attachPermissionsToConsumer(consumerName, permissions)
```
_Parameters_
- __consumerName__ <span class="mono">string</span>
- __permissions__ <span class="mono">[Permissions](Permissions)</span>


Grant permissions to a specific consumer of this table.


```js
table.attachPermissionsToConsumer("consumer1", ["s3"]);
```

### getFunction

```ts
getFunction(consumerName)
```
_Parameters_
- __consumerName__ <span class="mono">string</span>


Get the instance of the internally created Function, for a given consumer.
```js
 const table = new Table(stack, "Table", {
   consumers: {
     consumer1: "./src/function.handler",
   }
 })
table.getFunction("consumer1");
```

## TableConsumerProps


### function

_Type_ : <span class='mono'><span class="mono">string</span> | <span class="mono">[Function](Function#function)</span> | <span class="mono">[FunctionProps](Function#functionprops)</span></span>

Used to create the consumer function for the table.


### cdk.eventSource?

_Type_ : <span class="mono">[DynamoEventSourceProps](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_lambda.DynamoEventSourceProps.html)</span>

Override the settings of the internally created event source


## TableLocalIndexProps


### projection?

_Type_ : <span class='mono'><span class='mono'>Array&lt;<span class="mono">string</span>&gt;</span> | <span class="mono">"all"</span> | <span class="mono">"keys_only"</span></span>

_Default_ : <span class="mono">"all"</span>

The set of attributes that are projected into the secondary index.

### sortKey

_Type_ : <span class="mono">string</span>

The field that's to be used as the sort key for the index.


### cdk.index?

_Type_ : <span class="mono">Omit&lt;<span class="mono">[LocalSecondaryIndexProps](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_dynamodb.LocalSecondaryIndexProps.html)</span>, <span class='mono'><span class="mono">"indexName"</span> | <span class="mono">"sortKey"</span></span>&gt;</span>

Override the settings of the internally created local secondary indexes


## TableGlobalIndexProps


### partitionKey

_Type_ : <span class="mono">string</span>

The field that's to be used as a partition key for the index.

### projection?

_Type_ : <span class='mono'><span class='mono'>Array&lt;<span class="mono">string</span>&gt;</span> | <span class="mono">"all"</span> | <span class="mono">"keys_only"</span></span>

_Default_ : <span class="mono">"all"</span>

The set of attributes that are projected into the secondary index.

### sortKey?

_Type_ : <span class="mono">string</span>

The field that's to be used as the sort key for the index.


### cdk.index?

_Type_ : <span class="mono">Omit&lt;<span class="mono">[GlobalSecondaryIndexProps](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_dynamodb.GlobalSecondaryIndexProps.html)</span>, <span class='mono'><span class="mono">"indexName"</span> | <span class="mono">"sortKey"</span> | <span class="mono">"partitionKey"</span></span>&gt;</span>

Override the settings of the internally created global secondary index

