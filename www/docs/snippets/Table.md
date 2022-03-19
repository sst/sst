---
description: "Snippets for the sst.Table construct"
---

## Specifying just the primary index

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

## Adding global indexes

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

## Adding local indexes

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

## Configuring an index

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

## Enabling DynamoDB Streams

### Using the minimal config

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

### Lazily adding consumers

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

### Specifying function props for all the consumers

You can extend the minimal config, to set some function props and have them apply to all the consumers.

```js {2-6}
new Table(this, "Notes", {
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

### Using the full config

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

So in the above example, the `consumer1` function doesn't use the `timeout` that is set in the `defaultFunctionProps`. It'll instead use the one that is defined in the function definition (`10 seconds`). And the function will have both the `topicName` and the `bucketName` environment variables set; as well as permissions to both the `topic` and the `bucket`.

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

### Configuring the Stream content

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

### Configuring a consumer

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

## Enabling Kinesis Streams

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

## Importing an existing table

Override the internally created CDK `Table` instance.

```js {4}
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";

new Table(this, "Table", {
  dynamodbTable: dynamodb.Table.fromTableArn(this, "ImportedTable", tableArn),
});
```

## Upgrading to v0.21.0

The [v0.21.0 release](https://github.com/serverless-stack/serverless-stack/releases/tag/v0.21.1) of the Table construct includes a small breaking change. You might be impacted by this change if:

- You are currently using any version `< v0.21.0`
- And using consumers with table Streams enabled

### Using `consumers`

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

### Using `addConsumers`

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

## Configuring the DynamoDB table

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

## Enabling Global Tables

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
