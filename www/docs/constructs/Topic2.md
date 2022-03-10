---
description: "Docs for the sst.Topic construct in the @serverless-stack/resources package"
---


## Constructor
```ts
new Topic(scope: Construct, id: string, props: TopicProps)
```
_Parameters_
- scope [`Construct`](https://docs.aws.amazon.com/cdk/api/v2/docs/constructs.Construct.html)
- id `string`
- props [`TopicProps`](#topicprops)
## Properties
An instance of `Topic` has the following properties.
### snsSubscriptions

_Type_ : unknown

### snsTopic

_Type_ : [`Topic`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.Topic.html)

### subscriberFunctions

_Type_ : unknown

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
- scope [`Construct`](https://docs.aws.amazon.com/cdk/api/v2/docs/constructs.Construct.html)
- subscribers unknown
### attachPermissions

```ts
attachPermissions(permissions: Permissions)
```
_Parameters_
- permissions [`Permissions`](Permissions)
### attachPermissionsToSubscriber

```ts
attachPermissionsToSubscriber(index: number, permissions: Permissions)
```
_Parameters_
- index `number`
- permissions [`Permissions`](Permissions)
## TopicFunctionSubscriberProps
### function

_Type_ : [`FunctionDefinition`](FunctionDefinition)

### subscriberProps

_Type_ : [`LambdaSubscriptionProps`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.LambdaSubscriptionProps.html)

## TopicProps
### defaultFunctionProps

_Type_ : [`FunctionProps`](FunctionProps)

### snsTopic

_Type_ : [`ITopic`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.ITopic.html)&nbsp; | &nbsp;[`TopicProps`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.TopicProps.html)

### subscribers

_Type_ : unknown

## TopicQueueSubscriberProps
### queue

_Type_ : [`Queue`](Queue)

### subscriberProps

_Type_ : [`SqsSubscriptionProps`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.SqsSubscriptionProps.html)
