<!--
!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
!!                                                           !!
!!  This file has been automatically generated, do not edit  !!
!!                                                           !!
!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
-->

## Constructor
```ts
new Bucket(scope, id, props)
```
_Parameters_
- __scope__ <span class="mono">[Construct](https://docs.aws.amazon.com/cdk/api/v2/docs/constructs.Construct.html)</span>
- __id__ <span class="mono">string</span>
- __props__ <span class="mono">[BucketProps](#bucketprops)</span>
## BucketProps
### blockPublicACLs?

_Type_ : <span class="mono">boolean</span>

Block public access to this bucket. Setting this to 
`true`
 alllows uploading objects with public ACLs.
Note that setting to 
`true`
 does not necessarily mean that the bucket is completely accessible to the public. Rather, it enables the granting of public permissions through public ACLs.
```js
new Bucket(stack, "Bucket", {
  blockPublicACLs: true,
});
```
### cors?

_Type_ : <span class="mono">boolean</span><span class='mono'> | </span><span class='mono'>Array&lt;<span class="mono">[BucketCorsRule](#bucketcorsrule)</span>&gt;</span>

The CORS configuration of this bucket.
```js
new Bucket(stack, "Bucket", {
  cors: true,
});
```



```js
new Bucket(stack, "Bucket", {
  cors: [
    {
      allowedMethods: ["GET"],
      allowedOrigins: ["https://www.example.com"],
    }
  ],
});
```

### defaults.function?

_Type_ : <span class="mono">[FunctionProps](Function#functionprops)</span>


The default function props to be applied to all the Lambda functions in the API. The 
`environment`
, 
`permissions`
 and 
`layers`
 properties will be merged with per route definitions if they are defined.
```js
new Bucket(stack, "Bucket", {
  defaults: {
    function: {
      timeout: 20,
    }
  },
});
```
### name?

_Type_ : <span class="mono">string</span>

The name of the bucket.

Note that it's not recommended to hard code a name for the bucket, because they must be globally unique.
```js
new Bucket(stack, "Bucket", {
  name: "my-bucket",
});
```
### notifications?

_Type_ : <span class="mono">Record&lt;<span class="mono">string</span>, <span class="mono">[Queue](Queue#queue)</span><span class='mono'> | </span><span class="mono">[Topic](Topic#topic)</span><span class='mono'> | </span><span class="mono">string</span><span class='mono'> | </span><span class="mono">[Function](Function#function)</span><span class='mono'> | </span><span class="mono">[BucketFunctionNotificationProps](#bucketfunctionnotificationprops)</span><span class='mono'> | </span><span class="mono">[BucketQueueNotificationProps](#bucketqueuenotificationprops)</span><span class='mono'> | </span><span class="mono">[BucketTopicNotificationProps](#buckettopicnotificationprops)</span>&gt;</span>

Used to create notifications for various bucket events
```js
new Bucket(stack, "Bucket", {
  notifications: {
    myNotification: "src/notification.main",
  }
});
```

### cdk.bucket?

_Type_ : <span class="mono">[IBucket](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_s3.IBucket.html)</span><span class='mono'> | </span><span class="mono">[BucketProps](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_s3.BucketProps.html)</span>

Allows you to override default settings this construct uses internally to create the bucket.
```js
new Bucket(stack, "Bucket", {
  cdk: {
    bucket: {
      bucketName: "my-bucket",
    },
  }
});
```
### cdk.id?

_Type_ : <span class="mono">string</span>

Allows you to override default id for this construct.

## Properties
An instance of `Bucket` has the following properties.
### bucketArn

_Type_ : <span class="mono">string</span>

The ARN of the internally created 
`Bucket`
 instance.
### bucketName

_Type_ : <span class="mono">string</span>

The name of the internally created 
`Bucket`
 instance.
### id

_Type_ : <span class="mono">string</span>

### notificationFunctions

_Type_ : <span class='mono'>Array&lt;<span class="mono">[Function](Function#function)</span>&gt;</span>

A list of the internally created functions for the notifications.

### cdk.bucket

_Type_ : <span class="mono">[IBucket](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_s3.IBucket.html)</span>

The internally created CDK 
`Bucket`
 instance.

## Methods
An instance of `Bucket` has the following methods.
### addNotifications

```ts
addNotifications(scope, notifications)
```
_Parameters_
- __scope__ <span class="mono">[Construct](https://docs.aws.amazon.com/cdk/api/v2/docs/constructs.Construct.html)</span>
- __notifications__ <span class="mono">Record&lt;<span class="mono">string</span>, <span class="mono">[Queue](Queue#queue)</span><span class='mono'> | </span><span class="mono">[Topic](Topic#topic)</span><span class='mono'> | </span><span class="mono">string</span><span class='mono'> | </span><span class="mono">[Function](Function#function)</span><span class='mono'> | </span><span class="mono">[BucketFunctionNotificationProps](#bucketfunctionnotificationprops)</span><span class='mono'> | </span><span class="mono">[BucketQueueNotificationProps](#bucketqueuenotificationprops)</span><span class='mono'> | </span><span class="mono">[BucketTopicNotificationProps](#buckettopicnotificationprops)</span>&gt;</span>


Add notification subscriptions after the bucket has been created
```js {3}
const bucket = new Bucket(stack, "Bucket");
bucket.addNotifications(stack, {
  myNotification: "src/notification.main"
});
```
### attachPermissions

```ts
attachPermissions(permissions)
```
_Parameters_
- __permissions__ <span class="mono">[Permissions](Permissions)</span>


Attaches additional permissions to all bucket notifications
```js {20}
const bucket = new Bucket(stack, "Bucket", {
  notifications: {
    myNotification: "src/function.handler",
  }
});

bucket.attachPermissions(["s3"]);
```
### attachPermissionsToNotification

```ts
attachPermissionsToNotification(notificationName, permissions)
```
_Parameters_
- __notificationName__ <span class="mono">string</span>
- __permissions__ <span class="mono">[Permissions](Permissions)</span>


Attaches additional permissions to a specific bucket notification
```js {20}
const bucket = new Bucket(stack, "Bucket", {
  notifications: {
    myNotification: "src/function.handler",
  }
});

bucket.attachPermissionsToNotification("myNotification", ["s3"]);
```
### bind

```ts
bind(constructs)
```
_Parameters_
- __constructs__ <span class='mono'>Array&lt;<span class="mono">SSTConstruct</span>&gt;</span>


Binds the given list of resources to all bucket notifications
```js {20}
const bucket = new Bucket(stack, "Bucket", {
  notifications: {
    myNotification: "src/function.handler",
  }
});

bucket.bind([STRIPE_KEY, bucket]);
```
### bindToNotification

```ts
bindToNotification(notificationName, constructs)
```
_Parameters_
- __notificationName__ <span class="mono">string</span>
- __constructs__ <span class='mono'>Array&lt;<span class="mono">SSTConstruct</span>&gt;</span>


Binds the given list of resources to a specific bucket notification
```js {20}
const bucket = new Bucket(stack, "Bucket", {
  notifications: {
    myNotification: "src/function.handler",
  }
});

bucket.bindToNotification("myNotification", ["s3"]);
```
## BucketFilter
### prefix?

_Type_ : <span class="mono">string</span>

Filter what the key starts with
### suffix?

_Type_ : <span class="mono">string</span>

Filter what the key ends with
## BucketCorsRule
### allowedHeaders?

_Type_ : <span class='mono'>Array&lt;<span class="mono">string</span>&gt;</span>

The collection of allowed headers.
### allowedMethods

_Type_ : <span class='mono'>Array&lt;<span class="mono">"GET"</span><span class='mono'> | </span><span class="mono">"PUT"</span><span class='mono'> | </span><span class="mono">"HEAD"</span><span class='mono'> | </span><span class="mono">"POST"</span><span class='mono'> | </span><span class="mono">"DELETE"</span>&gt;</span>

The collection of allowed HTTP methods.
### allowedOrigins

_Type_ : <span class='mono'>Array&lt;<span class="mono">string</span>&gt;</span>

The collection of allowed origins.
```js
// Allow all origins
allowOrigins: ["*"]

// Allow specific origins. Note that the url protocol, ie. "https://", is required.
allowOrigins: ["https://domain.com"]
```
### exposedHeaders?

_Type_ : <span class='mono'>Array&lt;<span class="mono">string</span>&gt;</span>

The collection of exposed headers.
### id?

_Type_ : <span class="mono">string</span>

A unique identifier for this rule.
### maxAge?

_Type_ : <span class="mono">${number} second</span><span class='mono'> | </span><span class="mono">${number} seconds</span><span class='mono'> | </span><span class="mono">${number} minute</span><span class='mono'> | </span><span class="mono">${number} minutes</span><span class='mono'> | </span><span class="mono">${number} hour</span><span class='mono'> | </span><span class="mono">${number} hours</span><span class='mono'> | </span><span class="mono">${number} day</span><span class='mono'> | </span><span class="mono">${number} days</span>

Specify how long the results of a preflight response can be cached
## BucketQueueNotificationProps
Used to define a queue listener for the bucket
```js
new Bucket(stack, "Bucket", {
  notifications: {
    myNotification: {
      type: "queue",
      queue: new Queue(stack, "Queue")
    }
  }
}
```
### events?

_Type_ : <span class='mono'>Array&lt;<span class="mono">"object_created"</span><span class='mono'> | </span><span class="mono">"object_created_put"</span><span class='mono'> | </span><span class="mono">"object_created_post"</span><span class='mono'> | </span><span class="mono">"object_created_copy"</span><span class='mono'> | </span><span class="mono">"object_created_complete_multipart_upload"</span><span class='mono'> | </span><span class="mono">"object_removed"</span><span class='mono'> | </span><span class="mono">"object_removed_delete"</span><span class='mono'> | </span><span class="mono">"object_removed_delete_marker_created"</span><span class='mono'> | </span><span class="mono">"object_restore_post"</span><span class='mono'> | </span><span class="mono">"object_restore_completed"</span><span class='mono'> | </span><span class="mono">"object_restore_delete"</span><span class='mono'> | </span><span class="mono">"reduced_redundancy_lost_object"</span><span class='mono'> | </span><span class="mono">"replication_operation_failed_replication"</span><span class='mono'> | </span><span class="mono">"replication_operation_missed_threshold"</span><span class='mono'> | </span><span class="mono">"replication_operation_replicated_after_threshold"</span><span class='mono'> | </span><span class="mono">"replication_operation_not_tracked"</span><span class='mono'> | </span><span class="mono">"lifecycle_expiration"</span><span class='mono'> | </span><span class="mono">"lifecycle_expiration_delete"</span><span class='mono'> | </span><span class="mono">"lifecycle_expiration_delete_marker_created"</span><span class='mono'> | </span><span class="mono">"lifecycle_transition"</span><span class='mono'> | </span><span class="mono">"intelligent_tiering"</span><span class='mono'> | </span><span class="mono">"object_tagging"</span><span class='mono'> | </span><span class="mono">"object_tagging_put"</span><span class='mono'> | </span><span class="mono">"object_tagging_delete"</span><span class='mono'> | </span><span class="mono">"object_acl_put"</span>&gt;</span>

The S3 event types that will trigger the notification.
### filters?

_Type_ : <span class='mono'>Array&lt;<span class="mono">[BucketFilter](#bucketfilter)</span>&gt;</span>

S3 object key filter rules to determine which objects trigger this event.
### queue

_Type_ : <span class="mono">[Queue](Queue#queue)</span>

The queue to send notifications to
### type

_Type_ : <span class="mono">"queue"</span>

String literal to signify that the notification is a queue
## BucketTopicNotificationProps
Used to define a topic listener for the bucket
```js
new Bucket(stack, "Bucket", {
  notifications: {
    myNotification: {
      type: "topic",
      topic: new Topic(stack, "Topic")
    }
  }],
}
```
### events?

_Type_ : <span class='mono'>Array&lt;<span class="mono">"object_created"</span><span class='mono'> | </span><span class="mono">"object_created_put"</span><span class='mono'> | </span><span class="mono">"object_created_post"</span><span class='mono'> | </span><span class="mono">"object_created_copy"</span><span class='mono'> | </span><span class="mono">"object_created_complete_multipart_upload"</span><span class='mono'> | </span><span class="mono">"object_removed"</span><span class='mono'> | </span><span class="mono">"object_removed_delete"</span><span class='mono'> | </span><span class="mono">"object_removed_delete_marker_created"</span><span class='mono'> | </span><span class="mono">"object_restore_post"</span><span class='mono'> | </span><span class="mono">"object_restore_completed"</span><span class='mono'> | </span><span class="mono">"object_restore_delete"</span><span class='mono'> | </span><span class="mono">"reduced_redundancy_lost_object"</span><span class='mono'> | </span><span class="mono">"replication_operation_failed_replication"</span><span class='mono'> | </span><span class="mono">"replication_operation_missed_threshold"</span><span class='mono'> | </span><span class="mono">"replication_operation_replicated_after_threshold"</span><span class='mono'> | </span><span class="mono">"replication_operation_not_tracked"</span><span class='mono'> | </span><span class="mono">"lifecycle_expiration"</span><span class='mono'> | </span><span class="mono">"lifecycle_expiration_delete"</span><span class='mono'> | </span><span class="mono">"lifecycle_expiration_delete_marker_created"</span><span class='mono'> | </span><span class="mono">"lifecycle_transition"</span><span class='mono'> | </span><span class="mono">"intelligent_tiering"</span><span class='mono'> | </span><span class="mono">"object_tagging"</span><span class='mono'> | </span><span class="mono">"object_tagging_put"</span><span class='mono'> | </span><span class="mono">"object_tagging_delete"</span><span class='mono'> | </span><span class="mono">"object_acl_put"</span>&gt;</span>

The S3 event types that will trigger the notification.
### filters?

_Type_ : <span class='mono'>Array&lt;<span class="mono">[BucketFilter](#bucketfilter)</span>&gt;</span>

S3 object key filter rules to determine which objects trigger this event.
### topic

_Type_ : <span class="mono">[Topic](Topic#topic)</span>

The topic to send notifications to
### type

_Type_ : <span class="mono">"topic"</span>

## BucketFunctionNotificationProps
Used to define a function listener for the bucket
```js
new Bucket(stack, "Bucket", {
  notifications: {
    myNotification: {
      function: "src/notification.main"
    }
  }
}
```
### events?

_Type_ : <span class='mono'>Array&lt;<span class="mono">"object_created"</span><span class='mono'> | </span><span class="mono">"object_created_put"</span><span class='mono'> | </span><span class="mono">"object_created_post"</span><span class='mono'> | </span><span class="mono">"object_created_copy"</span><span class='mono'> | </span><span class="mono">"object_created_complete_multipart_upload"</span><span class='mono'> | </span><span class="mono">"object_removed"</span><span class='mono'> | </span><span class="mono">"object_removed_delete"</span><span class='mono'> | </span><span class="mono">"object_removed_delete_marker_created"</span><span class='mono'> | </span><span class="mono">"object_restore_post"</span><span class='mono'> | </span><span class="mono">"object_restore_completed"</span><span class='mono'> | </span><span class="mono">"object_restore_delete"</span><span class='mono'> | </span><span class="mono">"reduced_redundancy_lost_object"</span><span class='mono'> | </span><span class="mono">"replication_operation_failed_replication"</span><span class='mono'> | </span><span class="mono">"replication_operation_missed_threshold"</span><span class='mono'> | </span><span class="mono">"replication_operation_replicated_after_threshold"</span><span class='mono'> | </span><span class="mono">"replication_operation_not_tracked"</span><span class='mono'> | </span><span class="mono">"lifecycle_expiration"</span><span class='mono'> | </span><span class="mono">"lifecycle_expiration_delete"</span><span class='mono'> | </span><span class="mono">"lifecycle_expiration_delete_marker_created"</span><span class='mono'> | </span><span class="mono">"lifecycle_transition"</span><span class='mono'> | </span><span class="mono">"intelligent_tiering"</span><span class='mono'> | </span><span class="mono">"object_tagging"</span><span class='mono'> | </span><span class="mono">"object_tagging_put"</span><span class='mono'> | </span><span class="mono">"object_tagging_delete"</span><span class='mono'> | </span><span class="mono">"object_acl_put"</span>&gt;</span>

The S3 event types that will trigger the notification.
### filters?

_Type_ : <span class='mono'>Array&lt;<span class="mono">[BucketFilter](#bucketfilter)</span>&gt;</span>

S3 object key filter rules to determine which objects trigger this event.
### function

_Type_ : <span class="mono">string</span><span class='mono'> | </span><span class="mono">[Function](Function#function)</span><span class='mono'> | </span><span class="mono">[FunctionProps](Function#functionprops)</span>

The function to send notifications to
### type?

_Type_ : <span class="mono">"function"</span>

String literal to signify that the notification is a function