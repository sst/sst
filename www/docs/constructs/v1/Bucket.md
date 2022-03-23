---
description: "Docs for the sst.Bucket construct in the @serverless-stack/resources package"
---
<!--
!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
!!                                                           !!
!!  This file has been automatically generated, do not edit  !!
!!                                                           !!
!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
-->
The `Bucket` construct is a higher level CDK construct that makes it easy to create an S3 Bucket and to define its notifications. It also internally connects the notifications and bucket together.

## Constructor
```ts
new Bucket(scope: Construct, id: string, props: BucketProps)
```
_Parameters_
- __scope__ [`Construct`](https://docs.aws.amazon.com/cdk/api/v2/docs/constructs.Construct.html)
- __id__ `string`
- __props__ [`BucketProps`](#bucketprops)

## Examples

### Using the minimal config

```js
import { Bucket } from "@serverless-stack/resources";

new Bucket(this, "Bucket");
```

### Removing the S3 Bucket

Only empty S3 buckets can be deleted. However, you can configure the bucket to automatically delete all objects upon removal.

```js
import * as cdk from "aws-cdk-lib";

new Bucket(this, "Bucket", {
  s3Bucket: {
    autoDeleteObjects: true,
    removalPolicy: cdk.RemovalPolicy.DESTROY,
  },
});
```

## Properties
An instance of `Bucket` has the following properties.
### bucketArn

_Type_ : `string`

The ARN of the internally created CDK `Bucket` instance.

### bucketName

_Type_ : `string`

The name of the internally created CDK `Bucket` instance.

### notificationFunctions

_Type_ : Array< [`Function`](Function) >

A list of the internally created functions for the notifications.


### cdk.bucket

_Type_ : [`Bucket`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.Bucket.html)

The internally created CDK `Bucket` instance.


## Methods
An instance of `Bucket` has the following methods.
### addNotifications

```ts
addNotifications(scope: Construct, notifications: unknown)
```
_Parameters_
- __scope__ [`Construct`](https://docs.aws.amazon.com/cdk/api/v2/docs/constructs.Construct.html)
- __notifications__ Array< [`FunctionInlineDefinition`](FunctionInlineDefinition)&nbsp; | &nbsp;[`Queue`](Queue)&nbsp; | &nbsp;[`Topic`](Topic)&nbsp; | &nbsp;[`BucketFunctionNotificationProps`](#bucketfunctionnotificationprops)&nbsp; | &nbsp;[`BucketQueueNotificationProps`](#bucketqueuenotificationprops)&nbsp; | &nbsp;[`BucketTopicNotificationProps`](#buckettopicnotificationprops) >


Add notification subscriptions after the bucket has been created

#### Examples

```js {3}
const bucket = new Bucket(this, "Bucket");
bucket.addNotifications(this, ["src/notification.main"]);
```

### attachPermissions

```ts
attachPermissions(permissions: Permissions)
```
_Parameters_
- __permissions__ [`Permissions`](Permissions)


Attaches additional permissions to all bucket notifications

#### Examples

```js {20}
const bucket = new Bucket(this, "Bucket", {
  notifications: ["src/function.handler"],
});

bucket.attachPermissions(["s3"]);
```

### attachPermissionsToNotification

```ts
attachPermissionsToNotification(index: number, permissions: Permissions)
```
_Parameters_
- __index__ `number`
- __permissions__ [`Permissions`](Permissions)


Attaches additional permissions to a specific bucket notification

#### Examples

```js {20}
const bucket = new Bucket(this, "Bucket", {
  notifications: ["src/function.handler"],
});

bucket.attachPermissions(0, ["s3"]);
```

## BucketProps



### defaults.function?

_Type_ : [`FunctionProps`](FunctionProps)


The default function props to be applied to all the Lambda functions in the API. The `environment`, `permissions` and `layers` properties will be merged with per route definitions if they are defined.

#### Examples

```js
new Bucket(props.stack, "Bucket", {
  defaults: {
    function: {
      timeout: 20,
    }
  },
});
```

### notifications?

_Type_ : Array< [`FunctionInlineDefinition`](FunctionInlineDefinition)&nbsp; | &nbsp;[`Queue`](Queue)&nbsp; | &nbsp;[`Topic`](Topic)&nbsp; | &nbsp;[`BucketFunctionNotificationProps`](#bucketfunctionnotificationprops)&nbsp; | &nbsp;[`BucketQueueNotificationProps`](#bucketqueuenotificationprops)&nbsp; | &nbsp;[`BucketTopicNotificationProps`](#buckettopicnotificationprops) >

Used to create notifications for various bucket events

#### Examples

```js
new Bucket(this, "Bucket", {
  notifications: ["src/notification.main"],
});
```


### cdk.bucket?

_Type_ : [`Bucket`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.Bucket.html)&nbsp; | &nbsp;[`BucketProps`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.BucketProps.html)

Allows you to override default settings this construct uses internally to ceate the bucket

#### Examples

```js
new Bucket(this, "Bucket", {
  cdk: {
    bucket: {
      bucketName: "my-bucket",
    },
  }
});
```


## BucketFilter


### prefix?

_Type_ : `string`

Filter what the key starts with

### suffix?

_Type_ : `string`

Filter what the key ends with

## BucketQueueNotificationProps
Used to define a queue listener for the bucket

### Examples

```js
new Bucket(props.stack, "Bucket", {
  notifications: [{
    queue: new Queue(props.stack, "Queue"),
  }],
}
```

### events?

_Type_ : Array< `"object_created"`&nbsp; | &nbsp;`"object_created_put"`&nbsp; | &nbsp;`"object_created_post"`&nbsp; | &nbsp;`"object_created_copy"`&nbsp; | &nbsp;`"object_created_complete_multipart_upload"`&nbsp; | &nbsp;`"object_removed"`&nbsp; | &nbsp;`"object_removed_delete"`&nbsp; | &nbsp;`"object_removed_delete_marker_created"`&nbsp; | &nbsp;`"object_restore_post"`&nbsp; | &nbsp;`"object_restore_completed"`&nbsp; | &nbsp;`"reduced_redundancy_lost_object"`&nbsp; | &nbsp;`"replication_operation_failed_replication"`&nbsp; | &nbsp;`"replication_operation_missed_threshold"`&nbsp; | &nbsp;`"replication_operation_replicated_after_threshold"`&nbsp; | &nbsp;`"replication_operation_not_tracked"`&nbsp; | &nbsp;`"lifecycle_expiration"`&nbsp; | &nbsp;`"lifecycle_expiration_delete"`&nbsp; | &nbsp;`"lifecycle_expiration_delete_marker_created"`&nbsp; | &nbsp;`"lifecycle_transition"`&nbsp; | &nbsp;`"intelligent_tiering"`&nbsp; | &nbsp;`"object_tagging"`&nbsp; | &nbsp;`"object_tagging_put"`&nbsp; | &nbsp;`"object_tagging_delete"`&nbsp; | &nbsp;`"object_acl_put"` >

The S3 event types that will trigger the notification.

### filters?

_Type_ : Array< [`BucketFilter`](#bucketfilter) >

S3 object key filter rules to determine which objects trigger this event.

### queue

_Type_ : [`Queue`](Queue)

The queue to send notifications to

## BucketTopicNotificationProps
Used to define a topic listener for the bucket

### Examples

```js
new Bucket(props.stack, "Bucket", {
  notifications: [{
    queue: new Topic(props.stack, "Topic"),
  }],
}
```

### events?

_Type_ : Array< `"object_created"`&nbsp; | &nbsp;`"object_created_put"`&nbsp; | &nbsp;`"object_created_post"`&nbsp; | &nbsp;`"object_created_copy"`&nbsp; | &nbsp;`"object_created_complete_multipart_upload"`&nbsp; | &nbsp;`"object_removed"`&nbsp; | &nbsp;`"object_removed_delete"`&nbsp; | &nbsp;`"object_removed_delete_marker_created"`&nbsp; | &nbsp;`"object_restore_post"`&nbsp; | &nbsp;`"object_restore_completed"`&nbsp; | &nbsp;`"reduced_redundancy_lost_object"`&nbsp; | &nbsp;`"replication_operation_failed_replication"`&nbsp; | &nbsp;`"replication_operation_missed_threshold"`&nbsp; | &nbsp;`"replication_operation_replicated_after_threshold"`&nbsp; | &nbsp;`"replication_operation_not_tracked"`&nbsp; | &nbsp;`"lifecycle_expiration"`&nbsp; | &nbsp;`"lifecycle_expiration_delete"`&nbsp; | &nbsp;`"lifecycle_expiration_delete_marker_created"`&nbsp; | &nbsp;`"lifecycle_transition"`&nbsp; | &nbsp;`"intelligent_tiering"`&nbsp; | &nbsp;`"object_tagging"`&nbsp; | &nbsp;`"object_tagging_put"`&nbsp; | &nbsp;`"object_tagging_delete"`&nbsp; | &nbsp;`"object_acl_put"` >

The S3 event types that will trigger the notification.

### filters?

_Type_ : Array< [`BucketFilter`](#bucketfilter) >

S3 object key filter rules to determine which objects trigger this event.

### topic

_Type_ : [`Topic`](Topic)

The topic to send notifications to

## BucketFunctionNotificationProps
Used to define a function listener for the bucket

### Examples

```js
new Bucket(this, "Bucket", {
  notifications: [{
    function: "src/notification.main",
  }],
}
```

### events?

_Type_ : Array< `"object_created"`&nbsp; | &nbsp;`"object_created_put"`&nbsp; | &nbsp;`"object_created_post"`&nbsp; | &nbsp;`"object_created_copy"`&nbsp; | &nbsp;`"object_created_complete_multipart_upload"`&nbsp; | &nbsp;`"object_removed"`&nbsp; | &nbsp;`"object_removed_delete"`&nbsp; | &nbsp;`"object_removed_delete_marker_created"`&nbsp; | &nbsp;`"object_restore_post"`&nbsp; | &nbsp;`"object_restore_completed"`&nbsp; | &nbsp;`"reduced_redundancy_lost_object"`&nbsp; | &nbsp;`"replication_operation_failed_replication"`&nbsp; | &nbsp;`"replication_operation_missed_threshold"`&nbsp; | &nbsp;`"replication_operation_replicated_after_threshold"`&nbsp; | &nbsp;`"replication_operation_not_tracked"`&nbsp; | &nbsp;`"lifecycle_expiration"`&nbsp; | &nbsp;`"lifecycle_expiration_delete"`&nbsp; | &nbsp;`"lifecycle_expiration_delete_marker_created"`&nbsp; | &nbsp;`"lifecycle_transition"`&nbsp; | &nbsp;`"intelligent_tiering"`&nbsp; | &nbsp;`"object_tagging"`&nbsp; | &nbsp;`"object_tagging_put"`&nbsp; | &nbsp;`"object_tagging_delete"`&nbsp; | &nbsp;`"object_acl_put"` >

The S3 event types that will trigger the notification.

### filters?

_Type_ : Array< [`BucketFilter`](#bucketfilter) >

S3 object key filter rules to determine which objects trigger this event.

### function

_Type_ : [`FunctionDefinition`](FunctionDefinition)

The function to send notifications to
