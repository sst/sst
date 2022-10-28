<!--
!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
!!                                                           !!
!!  This file has been automatically generated, do not edit  !!
!!                                                           !!
!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
-->

## Constructor
```ts
new Queue(scope, id, props)
```
_Parameters_
- __scope__ <span class="mono">[Construct](https://docs.aws.amazon.com/cdk/api/v2/docs/constructs.Construct.html)</span>
- __id__ <span class="mono">string</span>
- __props__ <span class="mono">[QueueProps](#queueprops)</span>
## QueueProps


### consumer?

_Type_ : <span class='mono'><span class='mono'><span class="mono">string</span> | <span class="mono">[Function](Function#function)</span></span> | <span class="mono">[QueueConsumerProps](#queueconsumerprops)</span></span>

Used to create the consumer for the queue.


```js
new Queue(stack, "Queue", {
  consumer: "src/function.handler",
})
```


### cdk.id?

_Type_ : <span class="mono">string</span>

Allows you to override default id for this construct.

### cdk.queue?

_Type_ : <span class='mono'><span class="mono">[IQueue](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_sqs.IQueue.html)</span> | <span class="mono">[QueueProps](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_sqs.QueueProps.html)</span></span>

Override the default settings this construct uses internally to create the queue.


```js
new Queue(stack, "Queue", {
  consumer: "src/function.handler",
  cdk: {
    queue: {
      fifo: true,
    },
  }
});
```


## Properties
An instance of `Queue` has the following properties.
### consumerFunction?

_Type_ : <span class='mono'><span class="mono">[Function](Function#function)</span> | <span class="mono">[IFunction](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_lambda.IFunction.html)</span></span>

The internally created consumer `Function` instance.

### id

_Type_ : <span class="mono">string</span>

### queueArn

_Type_ : <span class="mono">string</span>

The ARN of the SQS Queue

### queueName

_Type_ : <span class="mono">string</span>

The name of the SQS Queue

### queueUrl

_Type_ : <span class="mono">string</span>

The URL of the SQS Queue


### cdk.queue

_Type_ : <span class="mono">[IQueue](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_sqs.IQueue.html)</span>

The internally created CDK `Queue` instance.


## Methods
An instance of `Queue` has the following methods.
### addConsumer

```ts
addConsumer(scope, consumer)
```
_Parameters_
- __scope__ <span class="mono">[Construct](https://docs.aws.amazon.com/cdk/api/v2/docs/constructs.Construct.html)</span>
- __consumer__ <span class='mono'><span class='mono'><span class="mono">string</span> | <span class="mono">[Function](Function#function)</span></span> | <span class="mono">[QueueConsumerProps](#queueconsumerprops)</span></span>


Adds a consumer after creating the queue. Note only one consumer can be added to a queue


```js {3}
const queue = new Queue(stack, "Queue");
queue.addConsumer(props.stack, "src/function.handler");
```

### attachPermissions

```ts
attachPermissions(permissions)
```
_Parameters_
- __permissions__ <span class="mono">[Permissions](Permissions)</span>


Attaches additional permissions to the consumer function


```js
const queue = new Queue(stack, "Queue", {
  consumer: "src/function.handler",
});
queue.attachPermissions(["s3"]);
```

### bind

```ts
bind(constructs)
```
_Parameters_
- __constructs__ <span class='mono'>Array&lt;<span class="mono">SSTConstruct</span>&gt;</span>


Binds the given list of resources to the consumer function


```js
const queue = new Queue(stack, "Queue", {
  consumer: "src/function.handler",
});
queue.bind([STRIPE_KEY, bucket]);
```

## QueueConsumerProps
Used to define the consumer for the queue and invocation details

### function?

_Type_ : <span class='mono'><span class="mono">string</span> | <span class="mono">[Function](Function#function)</span> | <span class="mono">[FunctionProps](Function#functionprops)</span></span>

Used to create the consumer function for the queue.


```js
new Queue(stack, "Queue", {
  consumer: {
    function: {
      handler: "src/function.handler",
      timeout: 10,
    },
  },
});
```


### cdk.eventSource?

_Type_ : <span class="mono">[SqsEventSourceProps](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_lambda.SqsEventSourceProps.html)</span>

This allows you to override the default settings this construct uses internally to create the consumer.


```js
new Queue(stack, "Queue", {
  consumer: {
    function: "test/lambda.handler",
    cdk: {
      eventSource: {
        batchSize: 5,
      },
    },
  },
});
```

### cdk.function?

_Type_ : <span class="mono">[IFunction](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_lambda.IFunction.html)</span>

This allows you to use an existing or imported Lambda function.


```js
new Queue(stack, "Queue", {
  consumer: {
    cdk: {
      function: lambda.Function.fromFunctionAttributes(stack, "ImportedFn", {
        functionArn: "arn:aws:lambda:us-east-1:123456789:function:my-function",
        role: iam.Role.fromRoleArn(stack, "IRole", "arn:aws:iam::123456789:role/my-role"),
      }),
    },
  },
});
```

