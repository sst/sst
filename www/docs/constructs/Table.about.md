The `Table` construct is a higher level CDK construct that makes it easy to create a [DynamoDB](https://aws.amazon.com/dynamodb/) table. It uses the following defaults:

- Defaults to using the [On-Demand capacity](https://aws.amazon.com/dynamodb/pricing/on-demand/) to make it perfectly serverless.
- Enables [Point-in-Time Recovery](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/PointInTimeRecovery.html) to make sure that you don't lose your data.
- Provides a nicer interface for defining indexes.

## Examples

### Primary index

```js
import { Table } from "sst/constructs";

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

```js {7-10}
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

table.addConsumers(stack, {
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
  },
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
    },
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

#### Filtering events

```js {10-20}
new Table(stack, "Notes", {
  fields: {
    noteId: "string",
  },
  primaryIndex: { partitionKey: "noteId" },
  stream: true,
  consumers: {
    myConsumer: {
      function: "src/consumer1.main",
      filters: [
        {
          dynamodb: {
            Keys: {
              Id: {
                N: ["101"],
              },
            },
          },
        },
      ],
    },
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
import { KinesisStream } from "sst/constructs";

const stream = new KinesisStream(stack, "Stream");

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
    table: dynamodb.Table.fromTableArn(stack, "ImportedTable", tableArn),
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
      replicationRegions: ["us-east-1", "us-east-2", "us-west-2"],
      replicationTimeout: Duration.hours(2),
    },
  },
});
```
