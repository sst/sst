---
description: "Docs for the sst.KinesisStream construct in the @serverless-stack/resources package"
---
<!--
!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
!!                                                           !!
!!  This file has been automatically generated, do not edit  !!
!!                                                           !!
!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
-->
The `KinesisStream` construct is a higher level CDK construct that makes it easy to create a [Kinesis Data Stream](https://aws.amazon.com/kinesis/data-streams/). You can create a stream and add a list of consumers to it.
This construct makes it easy to define a stream and its consumers. It also internally connects the consumers and the stream together.

## Constructor
```ts
new KinesisStream(scope, id, props)
```
_Parameters_
- __scope__ <span class="mono">[Construct](https://docs.aws.amazon.com/cdk/api/v2/docs/constructs.Construct.html)</span>
- __id__ <span class="mono">string</span>
- __props__ <span class="mono">[KinesisStreamProps](#kinesisstreamprops)</span>

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

stream.addConsumers(this, {
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
    stream: Stream.fromStreamArn(this, "ImportedStream", streamArn),
  },
});
```

## KinesisStreamProps


### consumers?

_Type_ : <span class="mono">Record&lt;<span class="mono">string</span>, <span class='mono'><span class='mono'><span class="mono">string</span> | <span class="mono">[Function](Function#function)</span></span> | <span class="mono">[KinesisStreamConsumerProps](#kinesisstreamconsumerprops)</span></span>&gt;</span>

Define the function consumers for this stream


```js
new KinesisStream(stack, "Stream", {
  consumers: {
    consumer1: "src/consumer1.main",
    consumer2: {
      function: {
        handler: "src/consumer2.handler",
        timeout: 30
      }
    }
  }
});
```


### defaults.function?

_Type_ : <span class="mono">[FunctionProps](Function#functionprops)</span>

The default function props to be applied to all the Lambda functions in the API. The `environment`, `permissions` and `layers` properties will be merged with per route definitions if they are defined.


```js
new KinesisStream(stack, "Stream", {
  defaults: {
    function: {
      timeout: 20,
    }
  }
});
```



### cdk.stream?

_Type_ : <span class='mono'><span class="mono">[IStream](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_kinesis.IStream.html)</span> | <span class="mono">[StreamProps](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_kinesis.StreamProps.html)</span></span>

Override the internally created Kinesis Stream


```js
new KinesisStream(stack, "Stream", {
  cdk: {
    stream: {
      streamName: "my-stream",
    }
  }
});
```


## Properties
An instance of `KinesisStream` has the following properties.
### streamArn

_Type_ : <span class="mono">string</span>

The ARN of the internally created Kinesis Stream

### streamName

_Type_ : <span class="mono">string</span>

The name of the internally created Kinesis Stream


### cdk.stream

_Type_ : <span class="mono">[IStream](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_kinesis.IStream.html)</span>

Return internally created Kinesis Stream


## Methods
An instance of `KinesisStream` has the following methods.
### addConsumers

```ts
addConsumers(scope, consumers)
```
_Parameters_
- __scope__ <span class="mono">[Construct](https://docs.aws.amazon.com/cdk/api/v2/docs/constructs.Construct.html)</span>
- __consumers__ 



Add consumers to a stream after creating it


```js
stream.addConsumers(stack, {
  consumer1: "src/function.handler"
})
```

### attachPermissions

```ts
attachPermissions(permissions)
```
_Parameters_
- __permissions__ <span class="mono">[Permissions](Permissions)</span>


Attaches the given list of permissions to all the consumers. This allows the functions to access other AWS resources.



```js
stream.attachPermissions(["s3"]);
```

### attachPermissionsToConsumer

```ts
attachPermissionsToConsumer(consumerName, permissions)
```
_Parameters_
- __consumerName__ <span class="mono">string</span>
- __permissions__ <span class="mono">[Permissions](Permissions)</span>


Attaches the given list of permissions to a specific consumer. This allows that function to access other AWS resources.


```js
stream.attachPermissionsToConsumer("consumer1", ["s3"]);
```

### getFunction

```ts
getFunction(consumerName)
```
_Parameters_
- __consumerName__ <span class="mono">string</span>


Get the function for a specific consumer


```js
stream.getFunction("consumer1");
```

## KinesisStreamConsumerProps
Used to define the function consumer for the stream

### function

_Type_ : <span class='mono'><span class="mono">string</span> | <span class="mono">[Function](Function#function)</span> | <span class="mono">[FunctionProps](Function#functionprops)</span></span>

The function definition


```js
new KinesisStream(stack, "Stream", {
  consumers: {
    consumer1: {
      function: {
        handler: "src/consumer1.handler",
        timeout: 30
      }
    }
  }
});
```


### cdk.eventSource?

_Type_ : <span class="mono">[KinesisEventSourceProps](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_lambda.KinesisEventSourceProps.html)</span>

Override the interally created event source


```js
new KinesisStream(stack, "Stream", {
  consumers: {
    fun: {
      cdk: {
        eventSource: {
          enabled: false
        }
      }
    }
  }
});
```

