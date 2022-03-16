---
description: "Docs for the sst.Topic construct in the @serverless-stack/resources package"
---


## Constructor
```ts
new Topic(scope: Construct, id: string, props: TopicProps)
```
_Parameters_
- __scope__ [`Construct`](https://docs.aws.amazon.com/cdk/api/v2/docs/constructs.Construct.html)
- __id__ `string`
- __props__ [`TopicProps`](#topicprops)
## Properties
An instance of `Topic` has the following properties.

### cdk.topic

_Type_ : [`ITopic`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.ITopic.html)


### snsSubscriptions

_Type_ : [`Subscription`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.Subscription.html)

### subscriberFunctions

_Type_ : [`Function`](Function)

### topicArn

_Type_ : `string`

### topicName

_Type_ : `string`

## Methods
An instance of `Topic` has the following methods.
### addSubscribers

```ts
addSubscribers(scope: Construct, subscribers: unknown)
```
_Parameters_
- __scope__ [`Construct`](https://docs.aws.amazon.com/cdk/api/v2/docs/constructs.Construct.html)
- __subscribers__ [`FunctionInlineDefinition`](FunctionInlineDefinition)&nbsp; | &nbsp;[`Queue`](Queue)&nbsp; | &nbsp;[`TopicFunctionSubscriberProps`](#topicfunctionsubscriberprops)&nbsp; | &nbsp;[`TopicQueueSubscriberProps`](#topicqueuesubscriberprops)
### attachPermissions

```ts
attachPermissions(permissions: Permissions)
```
_Parameters_
- __permissions__ [`Permissions`](Permissions)
### attachPermissionsToSubscriber

```ts
attachPermissionsToSubscriber(index: number, permissions: Permissions)
```
_Parameters_
- __index__ `number`
- __permissions__ [`Permissions`](Permissions)
## TopicFunctionSubscriberProps

### cdk.subscriptionProps

_Type_ : [`LambdaSubscriptionProps`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.LambdaSubscriptionProps.html)


### function

_Type_ : [`FunctionDefinition`](FunctionDefinition)

## TopicProps

### cdk.topic

_Type_ : [`ITopic`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.ITopic.html)&nbsp; | &nbsp;[`TopicProps`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.TopicProps.html)



### defaults.functionProps

_Type_ : [`FunctionProps`](FunctionProps)


### subscribers

_Type_ : [`FunctionInlineDefinition`](FunctionInlineDefinition)&nbsp; | &nbsp;[`Queue`](Queue)&nbsp; | &nbsp;[`TopicFunctionSubscriberProps`](#topicfunctionsubscriberprops)&nbsp; | &nbsp;[`TopicQueueSubscriberProps`](#topicqueuesubscriberprops)

## TopicQueueSubscriberProps

### cdk.subscriptionProps

_Type_ : [`SqsSubscriptionProps`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.SqsSubscriptionProps.html)


### queue

_Type_ : [`Queue`](Queue)
