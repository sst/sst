<!--
!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
!!                                                           !!
!!  This file has been automatically generated, do not edit  !!
!!                                                           !!
!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
-->

## Constructor
```ts
new KinesisStream(scope, id, props)
```
_Parameters_
- __scope__ <span class="mono">[Construct](https://docs.aws.amazon.com/cdk/api/v2/docs/constructs.Construct.html)</span>
- __id__ <span class="mono">string</span>
- __props__ <span class="mono">[KinesisStreamProps](#kinesisstreamprops)</span>
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



### cdk.id?

_Type_ : <span class="mono">string</span>

Allows you to override default id for this construct.

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
### id

_Type_ : <span class="mono">string</span>

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

### bind

```ts
bind(constructs)
```
_Parameters_
- __constructs__ <span class='mono'>Array&lt;<span class="mono">SSTConstruct</span>&gt;</span>


Binds the given list of resources to all the consumers.



```js
stream.bind([STRIPE_KEY, bucket]]);
```

### bindToConsumer

```ts
bindToConsumer(consumerName, constructs)
```
_Parameters_
- __consumerName__ <span class="mono">string</span>
- __constructs__ <span class='mono'>Array&lt;<span class="mono">SSTConstruct</span>&gt;</span>


Binds the given list of resources to a specific consumer.


```js
stream.bindToConsumer("consumer1", [STRIPE_KEY, bucket]);
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

