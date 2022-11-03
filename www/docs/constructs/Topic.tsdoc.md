<!--
!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
!!                                                           !!
!!  This file has been automatically generated, do not edit  !!
!!                                                           !!
!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
-->

## Constructor
```ts
new Topic(scope, id, props)
```
_Parameters_
- __scope__ <span class="mono">[Construct](https://docs.aws.amazon.com/cdk/api/v2/docs/constructs.Construct.html)</span>
- __id__ <span class="mono">string</span>
- __props__ <span class="mono">[TopicProps](#topicprops)</span>
## TopicProps



### defaults.function?

_Type_ : <span class="mono">[FunctionProps](Function#functionprops)</span>

The default function props to be applied to all the consumers in the Topic. The `environment`, `permissions` and `layers` properties will be merged with per route definitions if they are defined.



```js
new Topic(stack, "Topic", {
  defaults: {
    function: {
      timeout: 20,
    }
  },
});
```


### subscribers?

_Type_ : <span class="mono">Record&lt;<span class="mono">string</span>, <span class='mono'><span class='mono'><span class="mono">string</span> | <span class="mono">[Function](Function#function)</span></span> | <span class="mono">[Queue](Queue#queue)</span> | <span class="mono">[TopicQueueSubscriberProps](#topicqueuesubscriberprops)</span> | <span class="mono">[TopicFunctionSubscriberProps](#topicfunctionsubscriberprops)</span></span>&gt;</span>

Configure subscribers for this topic


```js
new Topic(stack, "Topic", {
  subscribers: {
    subscriber1: "src/function1.handler",
    subscriber2: "src/function2.handler"
  },
});
```


### cdk.id?

_Type_ : <span class="mono">string</span>

Allows you to override default id for this construct.

### cdk.topic?

_Type_ : <span class='mono'><span class="mono">[ITopic](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_sns.ITopic.html)</span> | <span class="mono">[TopicProps](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_sns.TopicProps.html)</span></span>

Override the default settings this construct uses internally to create the topic.


## Properties
An instance of `Topic` has the following properties.
### id

_Type_ : <span class="mono">string</span>

### subscriberFunctions

_Type_ : <span class='mono'>Array&lt;<span class="mono">[Function](Function#function)</span>&gt;</span>

A list of the internally created function instances for the subscribers.

### subscriptions

_Type_ : <span class='mono'>Array&lt;<span class="mono">[Subscription](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_sns.Subscription.html)</span>&gt;</span>

Get a list of subscriptions for this topic

### topicArn

_Type_ : <span class="mono">string</span>

The ARN of the internally created SNS Topic.

### topicName

_Type_ : <span class="mono">string</span>

The name of the internally created SNS Topic.


### cdk.topic

_Type_ : <span class="mono">[ITopic](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_sns.ITopic.html)</span>

The internally created CDK `Topic` instance.


## Methods
An instance of `Topic` has the following methods.
### addSubscribers

```ts
addSubscribers(scope, subscribers)
```
_Parameters_
- __scope__ <span class="mono">[Construct](https://docs.aws.amazon.com/cdk/api/v2/docs/constructs.Construct.html)</span>
- __subscribers__ 



Add subscribers to the topic.


```js {5}
const topic = new Topic(stack, "Topic", {
  subscribers: {
    subscriber1: "src/function1.handler",
    subscriber2: "src/function2.handler"
  },
});
topic.addSubscribers(stack, {
  subscriber3: "src/function3.handler"
});
```

### attachPermissions

```ts
attachPermissions(permissions)
```
_Parameters_
- __permissions__ <span class="mono">[Permissions](Permissions)</span>


Attaches the given list of permissions to all the subscriber functions. This allows the subscribers to access other AWS resources.



```js
const topic = new Topic(stack, "Topic", {
  subscribers: {
    subscriber1: "src/function1.handler",
    subscriber2: "src/function2.handler"
  },
});
topic.attachPermissions(["s3"]);
```

### attachPermissionsToSubscriber

```ts
attachPermissionsToSubscriber(subscriberName, permissions)
```
_Parameters_
- __subscriberName__ <span class="mono">string</span>
- __permissions__ <span class="mono">[Permissions](Permissions)</span>


Attaches the list of permissions to a specific subscriber.


```js {5}
const topic = new Topic(stack, "Topic", {
  subscribers: {
    subscriber1: "src/function1.handler",
    subscriber2: "src/function2.handler"
  },
});

topic.attachPermissionsToSubscriber("subscriber1", ["s3"]);
```

### bind

```ts
bind(constructs)
```
_Parameters_
- __constructs__ <span class='mono'>Array&lt;<span class="mono">SSTConstruct</span>&gt;</span>


Binds the given list of resources to all the subscriber functions.



```js
const topic = new Topic(stack, "Topic", {
  subscribers: {
    subscriber1: "src/function1.handler",
    subscriber2: "src/function2.handler"
  },
});
topic.bind([STRIPE_KEY, bucket]);
```

### bindToSubscriber

```ts
bindToSubscriber(subscriberName, constructs)
```
_Parameters_
- __subscriberName__ <span class="mono">string</span>
- __constructs__ <span class='mono'>Array&lt;<span class="mono">SSTConstruct</span>&gt;</span>


Binds the given list of resources to a specific subscriber.


```js {5}
const topic = new Topic(stack, "Topic", {
  subscribers: {
    subscriber1: "src/function1.handler",
    subscriber2: "src/function2.handler"
  },
});

topic.bindToSubscriber("subscriber1", [STRIPE_KEY, bucket]);
```

## TopicQueueSubscriberProps
Used to define a queue subscriber for a topic


```js
new Topic(stack, "Topic", {
  subscribers: {
    subscriber: {
      type: "queue",
      queue: new Queue(stack, "Queue", {
        consumer: "src/function.handler"
      })
    }
  }
})
```

### queue

_Type_ : <span class="mono">[Queue](Queue#queue)</span>

The queue that'll be added as a subscriber to the topic.

### type

_Type_ : <span class="mono">"queue"</span>

String literal to signify that the subscriber is a queue


### cdk.subscription?

_Type_ : <span class="mono">[SqsSubscriptionProps](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_sns.SqsSubscriptionProps.html)</span>

This allows you to override the default settings this construct uses internally to create the subscriber.


## TopicFunctionSubscriberProps
Used to define a function subscriber for a topic


```js
new Topic(stack, "Topic", {
  subscribers: {
    subscriber: "src/function.handler"
  }
})
```

### function

_Type_ : <span class='mono'><span class="mono">string</span> | <span class="mono">[Function](Function#function)</span> | <span class="mono">[FunctionProps](Function#functionprops)</span></span>

Used to create the subscriber function for the topic

### type?

_Type_ : <span class="mono">"function"</span>

String literal to signify that the subscriber is a function


### cdk.subscription?

_Type_ : <span class="mono">[LambdaSubscriptionProps](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_sns.LambdaSubscriptionProps.html)</span>

This allows you to override the default settings this construct uses internally to create the subscriber.

