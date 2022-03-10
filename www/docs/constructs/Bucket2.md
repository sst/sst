---
description: "Docs for the sst.Bucket construct in the @serverless-stack/resources package"
---


## Constructor
```ts
new Bucket(scope: Construct, id: string, props: BucketProps)
```
_Parameters_
- scope [`Construct`](https://docs.aws.amazon.com/cdk/api/v2/docs/constructs.Construct.html)
- id `string`
- props [`BucketProps`](#bucketprops)
## Properties
An instance of `Bucket` has the following properties.
### bucketArn

_Type_ : `string`

### bucketName

_Type_ : `string`

### notificationFunctions

_Type_ : unknown

### s3Bucket

_Type_ : [`Bucket`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.Bucket.html)

## Methods
An instance of `Bucket` has the following methods.
### addNotifications

```ts
addNotifications(scope: Construct, notifications: unknown)
```
_Parameters_
- scope [`Construct`](https://docs.aws.amazon.com/cdk/api/v2/docs/constructs.Construct.html)
- notifications unknown
### attachPermissions

```ts
attachPermissions(permissions: Permissions)
```
_Parameters_
- permissions [`Permissions`](Permissions)
### attachPermissionsToNotification

```ts
attachPermissionsToNotification(index: number, permissions: Permissions)
```
_Parameters_
- index `number`
- permissions [`Permissions`](Permissions)
## BucketFunctionNotificationProps
### function

_Type_ : [`FunctionDefinition`](FunctionDefinition)

### notificationProps

_Type_ : [`BucketNotificationProps`](#bucketnotificationprops)

## BucketNotificationProps
### events

_Type_ : unknown

### filters

_Type_ : unknown

## BucketProps
### defaultFunctionProps

_Type_ : [`FunctionProps`](FunctionProps)

### notifications

_Type_ : unknown

### s3Bucket

_Type_ : [`Bucket`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.Bucket.html)&nbsp; | &nbsp;[`BucketProps`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.BucketProps.html)

## BucketQueueNotificationProps
### notificationProps

_Type_ : [`BucketNotificationProps`](#bucketnotificationprops)

### queue

_Type_ : [`Queue`](Queue)

## BucketTopicNotificationProps
### notificationProps

_Type_ : [`BucketNotificationProps`](#bucketnotificationprops)

### topic

_Type_ : [`Topic`](Topic)
