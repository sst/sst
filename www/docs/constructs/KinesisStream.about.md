The `KinesisStream` construct is a higher level CDK construct that makes it easy to create a [Kinesis Data Stream](https://aws.amazon.com/kinesis/data-streams/). You can create a stream and add a list of consumers to it.

This construct makes it easy to define a stream and its consumers. It also internally connects the consumers and the stream together.

## Examples

### Using the minimal config

```js
import { KinesisStream } from "@serverless-stack/resources";

new KinesisStream(stack, "Stream", {
  consumers: {
    myConsumer: "src/lambda.main",
  }
});
```

### Configuring consumers

#### Lazily adding consumers

Add consumers after the stream has been created.

```js {8-10}
const stream = new KinesisStream(stack, "Stream", {
  consumers: {
    consumer1: "src/consumer1.main",
    consumer2: "src/consumer2.main",
  }
});

stream.addConsumers(stack, {
  consumer3: "src/consumer3.main",
});
```

#### Specifying function props for all the consumers

You can extend the minimal config, to set some function props and have them apply to all the consumers.

```js {3-7}
new KinesisStream(stack, "Stream", {
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

#### Configuring an individual consumer

Configure each Lambda function separately.

```js
new KinesisStream(stack, "Stream", {
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

Note that, you can set the `defaults.function` while using the `function` per consumer. The `function` will just override the `defaults.function`. Except for the `environment`, the `layers`, and the `permissions` properties, that will be merged.

```js
new KinesisStream(stack, "Stream", {
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

So in the above example, the `consumer1` function doesn't use the `timeout` that is set in the `defaults.function`. It'll instead use the one that is defined in the function definition (`10 seconds`). And the function will have both the `tableName` and the `bucketName` environment variables set; as well as permissions to both the `table` and the `bucket`.

#### Configuring consumer event source

Configure the internally created CDK Event Source.

```js {8-10}
import { StartingPosition } from "aws-cdk-lib/aws-lambda";

new KinesisStream(stack, "Stream", {
  consumers: {
    consumer1: {
      function: "src/consumer1.main",
      cdk: {
        eventSource: {
          startingPosition: StartingPosition.LATEST,
        },
      },
    },
  }
});
```

#### Giving the consumers some permissions

Allow the consumer functions to access S3.

```js {8}
const stream = new KinesisStream(stack, "Stream", {
  consumers: {
    consumer1: "src/consumer1.main",
    consumer2: "src/consumer2.main",
  }
});

stream.attachPermissions(["s3"]);
```

#### Giving a specific consumers some permissions

Allow a specific consumer function to access S3.

```js {8}
const stream = new KinesisStream(stack, "Stream", {
  consumers: {
    consumer1: "src/consumer1.main",
    consumer2: "src/consumer2.main",
  }
});

stream.attachPermissionsToConsumer("consumer1", ["s3"]);
```

### Advanced examples

#### Configuring the Kinesis stream

Configure the internally created CDK `Stream` instance.

```js {7-9}
new KinesisStream(stack, "Stream", {
  consumers: {
    consumer1: "src/consumer1.main",
    consumer2: "src/consumer2.main",
  }
  cdk: {
    stream: {
      shardCount: 3,
    }
  },
});
```

#### Importing an existing stream

Override the internally created CDK `Stream` instance.

```js {5}
import { Stream } from "aws-cdk-lib/aws-kinesis";

new KinesisStream(stack, "Stream", {
  cdk: {
    stream: Stream.fromStreamArn(stack, "ImportedStream", streamArn),
  },
});
```
