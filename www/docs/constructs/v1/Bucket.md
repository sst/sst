---
description: "Docs for the sst.Bucket construct in the @serverless-stack/resources package"
---
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

```js {5-6}
import * as cdk from "aws-cdk-lib";

new Bucket(this, "Bucket", {
  s3Bucket: {
    autoDeleteObjects: true,
    removalPolicy: cdk.RemovalPolicy.DESTROY,
  },
});
```


### Lazily adding notifications

Create an _empty_ bucket and lazily add the notifications.

```js {3}
const bucket = new Bucket(this, "Bucket");

bucket.addNotifications(this, ["src/notification.main"]);
```


### Giving the notifications some permissions

Allow the notification functions to access S3.

```js {20}
import { EventType } from "aws-cdk-lib/aws-s3";

const bucket = new Bucket(this, "Bucket", {
  notifications: [
    {
      function: "src/notification1.main",
      notificationProps: {
        events: [EventType.OBJECT_CREATED],
      },
    },
    {
      function: "src/notification2.main",
      notificationProps: {
        events: [EventType.OBJECT_REMOVED],
      },
    },
  ],
});

bucket.attachPermissions(["s3"]);
```


### Giving a specific notification some permissions

Allow the first notification function to access S3.

```js {20}
import { EventType } from "aws-cdk-lib/aws-s3";

const bucket = new Bucket(this, "Bucket", {
  notifications: [
    {
      function: "src/notification1.main",
      notificationProps: {
        events: [EventType.OBJECT_CREATED],
      },
    },
    {
      function: "src/notification2.main",
      notificationProps: {
        events: [EventType.OBJECT_REMOVED],
      },
    },
  ],
});

bucket.attachPermissionsToNotification(0, ["s3"]);
```


### Configuring the S3 Bucket

Configure the internally created CDK `Bucket` instance.

```js {2-4}
new Bucket(this, "Bucket", {
  cdk: {
    bucket: {
      bucketName: "my-bucket",
    },
  }
});
```


### Specifying function props for all the notifications

You can extend the minimal config, to set some function props and have them apply to all the notifications.

```js {3-7}
new Bucket(this, "Bucket", {
  defaults: {
    function: {
      timeout: 20,
      environment: { tableName: table.tableName },
      permissions: [table],
    },
  }
  notifications: [
    {
      function: "src/notification1.main",
      notificationProps: {
        events: [EventType.OBJECT_CREATED],
      },
    },
    {
      function: "src/notification2.main",
      notificationProps: {
        events: [EventType.OBJECT_REMOVED],
      },
    },
  ],
});
```


### Enabling S3 Event Notifications

#### Using the minimal config

```js
import { Bucket } from "@serverless-stack/resources";

new Bucket(this, "Bucket", {
  notifications: ["src/notification.main"],
});
```

Or configuring the notification events.

```js {5-10}
import { EventType } from "aws-cdk-lib/aws-s3";

const bucket = new Bucket(this, "Bucket", {
  notifications: [
    {
      function: "src/notification.main",
      notificationProps: {
        events: [EventType.OBJECT_CREATED],
      },
    },
  ],
});
```

### Configuring Queue notifications

#### Specifying the Queue directly

You can directly pass in an instance of the [Queue](Queue.md) construct.

```js {6}
import { Queue } from "@serverless-stack/resources";

const myQueue = new Queue(this, "MyQueue");

new Bucket(this, "Bucket", {
  notifications: [myQueue],
});
```

#### Configuring the notification

```js {5-11}
const myQueue = new Queue(this, "MyQueue");

new Bucket(this, "Bucket", {
  notifications: [
    {
      queue: myQueue,
      notificationProps: {
        events: [EventType.OBJECT_CREATED_PUT],
        filters: [{ prefix: "imports/" }, { suffix: ".jpg" }],
      }
    }
  ],
});
```

### Configuring Topic notifications

#### Specifying the Topic directly

You can directly pass in an instance of the [Topic](Topic.md) construct.

```js {6}
import { Topic } from "@serverless-stack/resources";

const myTopic = new Topic(this, "MyTopic");

new Bucket(this, "Bucket", {
  notifications: [myTopic],
});
```

#### Configuring the notification

```js {5-11}
const myTopic = new Topic(this, "MyTopic");

new Bucket(this, "Bucket", {
  notifications: [
    {
      topic: myTopic,
      notificationProps: {
        events: [EventType.OBJECT_CREATED_PUT],
        filters: [{ prefix: "imports/" }, { suffix: ".jpg" }],
      }
    }
  ],
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


### cdk.bucket

_Type_ : [`Bucket`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.Bucket.html)

The internally created CDK `Bucket` instance.


### notificationFunctions

_Type_ : [`Function`](Function)

A list of the internally created functions for the notifications.

## Methods
An instance of `Bucket` has the following methods.
### addNotifications

```ts
addNotifications(scope: Construct, notifications: unknown)
```
_Parameters_
- __scope__ [`Construct`](https://docs.aws.amazon.com/cdk/api/v2/docs/constructs.Construct.html)
- __notifications__ [`FunctionInlineDefinition`](FunctionInlineDefinition)&nbsp; | &nbsp;[`BucketFunctionNotificationProps`](#bucketfunctionnotificationprops)&nbsp; | &nbsp;[`Queue`](Queue)&nbsp; | &nbsp;[`BucketQueueNotificationProps`](#bucketqueuenotificationprops)&nbsp; | &nbsp;[`Topic`](Topic)&nbsp; | &nbsp;[`BucketTopicNotificationProps`](#buckettopicnotificationprops)


Add notification subscriptions after the bucket has been created

### attachPermissions

```ts
attachPermissions(permissions: Permissions)
```
_Parameters_
- __permissions__ [`Permissions`](Permissions)


Attaches additional permissions to all bucket notifications

### attachPermissionsToNotification

```ts
attachPermissionsToNotification(index: number, permissions: Permissions)
```
_Parameters_
- __index__ `number`
- __permissions__ [`Permissions`](Permissions)


Attaches additional permissions to a specific bucket notification

## BucketBaseNotificationProps
### events

_Type_ : `"object_created"`&nbsp; | &nbsp;`"object_created_put"`&nbsp; | &nbsp;`"object_created_post"`&nbsp; | &nbsp;`"object_created_copy"`&nbsp; | &nbsp;`"object_created_complete_multipart_upload"`&nbsp; | &nbsp;`"object_removed"`&nbsp; | &nbsp;`"object_removed_delete"`&nbsp; | &nbsp;`"object_removed_delete_marker_created"`&nbsp; | &nbsp;`"object_restore_post"`&nbsp; | &nbsp;`"object_restore_completed"`&nbsp; | &nbsp;`"reduced_redundancy_lost_object"`&nbsp; | &nbsp;`"replication_operation_failed_replication"`&nbsp; | &nbsp;`"replication_operation_missed_threshold"`&nbsp; | &nbsp;`"replication_operation_replicated_after_threshold"`&nbsp; | &nbsp;`"replication_operation_not_tracked"`&nbsp; | &nbsp;`"lifecycle_expiration"`&nbsp; | &nbsp;`"lifecycle_expiration_delete"`&nbsp; | &nbsp;`"lifecycle_expiration_delete_marker_created"`&nbsp; | &nbsp;`"lifecycle_transition"`&nbsp; | &nbsp;`"intelligent_tiering"`&nbsp; | &nbsp;`"object_tagging"`&nbsp; | &nbsp;`"object_tagging_put"`&nbsp; | &nbsp;`"object_tagging_delete"`&nbsp; | &nbsp;`"object_acl_put"`

The S3 event types that will trigger the notification.

### filters

_Type_ : [`BucketFilter`](#bucketfilter)

S3 object key filter rules to determine which objects trigger this event.

## BucketFilter
### prefix

_Type_ : `string`

Filter what the key starts with

### suffix

_Type_ : `string`

Filter what the key ends with

## BucketFunctionNotificationProps
### events

_Type_ : `"object_created"`&nbsp; | &nbsp;`"object_created_put"`&nbsp; | &nbsp;`"object_created_post"`&nbsp; | &nbsp;`"object_created_copy"`&nbsp; | &nbsp;`"object_created_complete_multipart_upload"`&nbsp; | &nbsp;`"object_removed"`&nbsp; | &nbsp;`"object_removed_delete"`&nbsp; | &nbsp;`"object_removed_delete_marker_created"`&nbsp; | &nbsp;`"object_restore_post"`&nbsp; | &nbsp;`"object_restore_completed"`&nbsp; | &nbsp;`"reduced_redundancy_lost_object"`&nbsp; | &nbsp;`"replication_operation_failed_replication"`&nbsp; | &nbsp;`"replication_operation_missed_threshold"`&nbsp; | &nbsp;`"replication_operation_replicated_after_threshold"`&nbsp; | &nbsp;`"replication_operation_not_tracked"`&nbsp; | &nbsp;`"lifecycle_expiration"`&nbsp; | &nbsp;`"lifecycle_expiration_delete"`&nbsp; | &nbsp;`"lifecycle_expiration_delete_marker_created"`&nbsp; | &nbsp;`"lifecycle_transition"`&nbsp; | &nbsp;`"intelligent_tiering"`&nbsp; | &nbsp;`"object_tagging"`&nbsp; | &nbsp;`"object_tagging_put"`&nbsp; | &nbsp;`"object_tagging_delete"`&nbsp; | &nbsp;`"object_acl_put"`

The S3 event types that will trigger the notification.

### filters

_Type_ : [`BucketFilter`](#bucketfilter)

S3 object key filter rules to determine which objects trigger this event.

### function

_Type_ : [`FunctionDefinition`](FunctionDefinition)

The function to send notifications to

## BucketProps

### cdk.bucket

_Type_ : [`Bucket`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.Bucket.html)&nbsp; | &nbsp;[`BucketProps`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.BucketProps.html)

Allows you to override default settings this construct uses internally to ceate the bucket



### defaults.function

_Type_ : [`FunctionProps`](FunctionProps)


The default function props to be applied to all the Lambda functions in the Bucket. If the `function` is specified for a notification, these default values are overridden. Except for the `environment`, the `layers`, and the `permissions` properties, that will be merged.

### notifications

_Type_ : [`FunctionInlineDefinition`](FunctionInlineDefinition)&nbsp; | &nbsp;[`BucketFunctionNotificationProps`](#bucketfunctionnotificationprops)&nbsp; | &nbsp;[`Queue`](Queue)&nbsp; | &nbsp;[`BucketQueueNotificationProps`](#bucketqueuenotificationprops)&nbsp; | &nbsp;[`Topic`](Topic)&nbsp; | &nbsp;[`BucketTopicNotificationProps`](#buckettopicnotificationprops)

Used to create notifications for various bucket events

## BucketQueueNotificationProps
### events

_Type_ : `"object_created"`&nbsp; | &nbsp;`"object_created_put"`&nbsp; | &nbsp;`"object_created_post"`&nbsp; | &nbsp;`"object_created_copy"`&nbsp; | &nbsp;`"object_created_complete_multipart_upload"`&nbsp; | &nbsp;`"object_removed"`&nbsp; | &nbsp;`"object_removed_delete"`&nbsp; | &nbsp;`"object_removed_delete_marker_created"`&nbsp; | &nbsp;`"object_restore_post"`&nbsp; | &nbsp;`"object_restore_completed"`&nbsp; | &nbsp;`"reduced_redundancy_lost_object"`&nbsp; | &nbsp;`"replication_operation_failed_replication"`&nbsp; | &nbsp;`"replication_operation_missed_threshold"`&nbsp; | &nbsp;`"replication_operation_replicated_after_threshold"`&nbsp; | &nbsp;`"replication_operation_not_tracked"`&nbsp; | &nbsp;`"lifecycle_expiration"`&nbsp; | &nbsp;`"lifecycle_expiration_delete"`&nbsp; | &nbsp;`"lifecycle_expiration_delete_marker_created"`&nbsp; | &nbsp;`"lifecycle_transition"`&nbsp; | &nbsp;`"intelligent_tiering"`&nbsp; | &nbsp;`"object_tagging"`&nbsp; | &nbsp;`"object_tagging_put"`&nbsp; | &nbsp;`"object_tagging_delete"`&nbsp; | &nbsp;`"object_acl_put"`

The S3 event types that will trigger the notification.

### filters

_Type_ : [`BucketFilter`](#bucketfilter)

S3 object key filter rules to determine which objects trigger this event.

### queue

_Type_ : [`Queue`](Queue)

The queue to send notifications to

## BucketTopicNotificationProps
### events

_Type_ : `"object_created"`&nbsp; | &nbsp;`"object_created_put"`&nbsp; | &nbsp;`"object_created_post"`&nbsp; | &nbsp;`"object_created_copy"`&nbsp; | &nbsp;`"object_created_complete_multipart_upload"`&nbsp; | &nbsp;`"object_removed"`&nbsp; | &nbsp;`"object_removed_delete"`&nbsp; | &nbsp;`"object_removed_delete_marker_created"`&nbsp; | &nbsp;`"object_restore_post"`&nbsp; | &nbsp;`"object_restore_completed"`&nbsp; | &nbsp;`"reduced_redundancy_lost_object"`&nbsp; | &nbsp;`"replication_operation_failed_replication"`&nbsp; | &nbsp;`"replication_operation_missed_threshold"`&nbsp; | &nbsp;`"replication_operation_replicated_after_threshold"`&nbsp; | &nbsp;`"replication_operation_not_tracked"`&nbsp; | &nbsp;`"lifecycle_expiration"`&nbsp; | &nbsp;`"lifecycle_expiration_delete"`&nbsp; | &nbsp;`"lifecycle_expiration_delete_marker_created"`&nbsp; | &nbsp;`"lifecycle_transition"`&nbsp; | &nbsp;`"intelligent_tiering"`&nbsp; | &nbsp;`"object_tagging"`&nbsp; | &nbsp;`"object_tagging_put"`&nbsp; | &nbsp;`"object_tagging_delete"`&nbsp; | &nbsp;`"object_acl_put"`

The S3 event types that will trigger the notification.

### filters

_Type_ : [`BucketFilter`](#bucketfilter)

S3 object key filter rules to determine which objects trigger this event.

### topic

_Type_ : [`Topic`](Topic)

The topic to send notifications to
