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
new KinesisStream(scope: Construct, id: string, props: KinesisStreamProps)
```
_Parameters_
- __scope__ [`Construct`](https://docs.aws.amazon.com/cdk/api/v2/docs/constructs.Construct.html)
- __id__ `string`
- __props__ [`KinesisStreamProps`](#kinesisstreamprops)
## Properties
An instance of `KinesisStream` has the following properties.
### streamArn

_Type_ : `string`

The ARN of the internally created Kinesis Stream

### streamName

_Type_ : `string`

The name of the internally created Kinesis Stream


### cdk.stream

_Type_ : [`IStream`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.IStream.html)

Return internally created Kinesis Stream


## Methods
An instance of `KinesisStream` has the following methods.
### addConsumers

```ts
addConsumers(scope: Construct, consumers: unknown)
```
_Parameters_
- __scope__ [`Construct`](https://docs.aws.amazon.com/cdk/api/v2/docs/constructs.Construct.html)
- __consumers__ 



Add consumers to a stream after creating it

#### Examples

```js
stream.addConsumers({
  consumer1: "src/function.handler"
})
```

### attachPermissions

```ts
attachPermissions(permissions: Permissions)
```
_Parameters_
- __permissions__ [`Permissions`](Permissions)


Attaches the given list of permissions to all the consumers. This allows the functions to access other AWS resources.

#### Examples


```js
stream.attachPermissions(["s3"]);
```

### attachPermissionsToConsumer

```ts
attachPermissionsToConsumer(consumerName: string, permissions: Permissions)
```
_Parameters_
- __consumerName__ `string`
- __permissions__ [`Permissions`](Permissions)


Attaches the given list of permissions to a specific consumer. This allows that function to access other AWS resources.

#### Examples

```js
stream.attachPermissionsToConsumer("consumer1", ["s3"]);
```

### getFunction

```ts
getFunction(consumerName: string)
```
_Parameters_
- __consumerName__ `string`


Get the function for a specific consumer

#### Examples

```js
stream.getFunction("consumer1");
```

## KinesisStreamProps


### consumers?

_Type_ : Record<`string`, [`FunctionInlineDefinition`](FunctionInlineDefinition)&nbsp; | &nbsp;[`KinesisStreamConsumerProps`](#kinesisstreamconsumerprops)>

Define the function consumers for this stream

#### Examples

```js
new KinesisStream(this, "Stream", {
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

_Type_ : [`FunctionProps`](FunctionProps)

The default function props to be applied to all the Lambda functions in the API. The `environment`, `permissions` and `layers` properties will be merged with per route definitions if they are defined.

#### Examples

```js
new KinesisStream(props.stack, "Stream", {
  defaults: {
    function: {
      timeout: 20,
    }
  }
});
```



### cdk.stream?

_Type_ : [`IStream`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.IStream.html)&nbsp; | &nbsp;[`StreamProps`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.StreamProps.html)

Override the internally created Kinesis Stream

#### Examples

```js
new KinesisStream(this, "Stream", {
  cdk: {
    stream: {
      streamName: "my-stream",
    }
  }
});
```


## KinesisStreamConsumerProps
Used to define the function consumer for the stream

### function

_Type_ : [`FunctionDefinition`](FunctionDefinition)

The function definition

#### Examples

```js
new KinesisStream(this, "Stream", {
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

_Type_ : [`KinesisEventSourceProps`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.KinesisEventSourceProps.html)

Override the interally created event source

#### Examples

```js
new KinesisStream(this, "Stream", {
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

