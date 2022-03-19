---
description: "Snippets for the sst.KinesisStream construct"
---

## Using the minimal config

```js
import { KinesisStream } from "@serverless-stack/resources";

new KinesisStream(this, "Stream", {
  consumers: {
    consumer1: "src/consumer1.main",
    consumer2: "src/consumer2.main",
  }
});
```

## Adding consumers

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

## Lazily adding consumers

Create an _empty_ stream and lazily add the consumers.

```js {3-6}
const stream = new KinesisStream(this, "Stream");

stream.addConsumers(this, {
  consumer1: "src/consumer1.main",
  consumer2: "src/consumer2.main",
});
```

## Specifying function props for all the consumers

You can extend the minimal config, to set some function props and have them apply to all the consumers.

```js {2-6}
new KinesisStream(this, "Stream", {
  defaults: {
    function: {
      timeout: 20,
      environment: { tableName: table.tableName },
      permissions: [table],
    },
  },
  consumers: {
    consumer1: "src/consumer1.main",
    consumer2: "src/consumer2.main",
  }
});
```

## Using the full config

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
  defaults: {
    function: {
      timeout: 20,
      environment: { tableName: table.tableName },
      permissions: [table],
    },
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

## Giving the consumers some permissions

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

## Giving a specific consumers some permissions

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

## Configuring the Kinesis stream

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

## Configuring a consumer

Configure the internally created CDK Event Source.

```js {5-10}
import { StartingPosition } from "aws-cdk-lib/aws-lambda";

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

## Importing an existing stream

Override the internally created CDK `Stream` instance.

```js {4}
import { Stream } from "aws-cdk-lib/aws-kinesis";

new KinesisStream(this, "Stream", {
  kinesisStream: Stream.fromStreamArn(this, "ImportedStream", streamArn),
});
```
