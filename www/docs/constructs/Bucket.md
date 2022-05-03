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
new Bucket(scope, id, props)
```
_Parameters_
- __scope__ <span class="mono">[Construct](https://docs.aws.amazon.com/cdk/api/v2/docs/constructs.Construct.html)</span>
- __id__ <span class="mono">string</span>
- __props__ <span class="mono">[BucketProps](#bucketprops)</span>

## Examples

### Using the minimal config

```js
import { Bucket } from "@serverless-stack/resources";

new Bucket(stack, "Bucket");
```


### Configuring notifications

#### Using the minimal config

```js
import { Bucket } from "@serverless-stack/resources";

new Bucket(stack, "Bucket", {
  notifications: {
    myNotification: "src/notification.main",
  },
});
```

Or configuring the notification events.

```js {y}
import { EventType } from "aws-cdk-lib/aws-s3";

const bucket = new Bucket(stack, "Bucket", {
  notifications: {
    myNotification: {
      function: "src/notification.main",
      events: ["object_created"],
    },
  },
});
```

#### Lazily adding notifications

Create an _empty_ bucket and lazily add the notifications.

```js {3}
const bucket = new Bucket(stack, "Bucket");

bucket.addNotifications(this, {
  myNotification: "src/notification.main",
});
```

### Configuring Function notifications

#### Specifying function props for all the notifications

You can extend the minimal config, to set some function props and have them apply to all the notifications.

```js {3-7}
new Bucket(stack, "Bucket", {
  defaults: {
    function: {
      timeout: 20,
      environment: { tableName: table.tableName },
      permissions: [table],
    },
  },
  notifications: {
    myNotification1: {
      function: "src/notification1.main",
      events: ["object_created"],
    },
    myNotification2: {
      function: "src/notification2.main",
      events: ["object_removed"],
    },
  },
});
```

#### Configuring an individual notification

Configure each Lambda function separately.

```js
new Bucket(stack, "Bucket", {
  notifications: {
    myNotification: {
      function: {
        srcPath: "src/",
        handler: "notification.main",
        environment: { tableName: table.tableName },
        permissions: [table],
      },
      events: ["object_created"],
    },
  },
});
```

Note that, you can set the `defaults.function` while using the `function` per notification. The `function` will just override the `defaults.function`. Except for the `environment`, the `layers`, and the `permissions` properties, that will be merged.

```js
new Bucket(stack, "Bucket", {
  defaults: {
    function: {
      timeout: 20,
      environment: { tableName: table.tableName },
      permissions: [table],
    },
  },
  notifications: {
    myNotification1: {
      function: {
        handler: "src/notification1.main",
        timeout: 10,
        environment: { bucketName: bucket.bucketName },
        permissions: [bucket],
      },
      events: ["object_created"],
    },
    myNotification2: {
      function: "src/notification2.main",
      events: ["object_removed"],
    },
  },
});
```

So in the above example, the `myNotification1` function doesn't use the `timeout` that is set in the `defaults.function`. It'll instead use the one that is defined in the function definition (`10 seconds`). And the function will have both the `tableName` and the `bucketName` environment variables set; as well as permissions to both the `table` and the `bucket`.

#### Giving the notifications some permissions

Allow the notification functions to access S3.

```js {16}
import { EventType } from "aws-cdk-lib/aws-s3";

const bucket = new Bucket(stack, "Bucket", {
  notifications: {
    myNotification1: {
      function: "src/notification1.main",
      events: ["object_created"],
    },
    myNotification2: {
      function: "src/notification2.main",
      events: ["object_removed"],
    },
  },
});

bucket.attachPermissions(["s3"]);
```

#### Giving a specific notification some permissions

Allow the first notification function to access S3.

```js {16}
import { EventType } from "aws-cdk-lib/aws-s3";

const bucket = new Bucket(stack, "Bucket", {
  notifications: {
    myNotification1: {
      function: "src/notification1.main",
      events: ["object_created"],
    },
    myNotification2: {
      function: "src/notification2.main",
      events: ["object_removed"],
    },
  },
});

bucket.attachPermissionsToNotification(0, ["s3"]);
```

### Configuring Queue notifications

#### Specifying the Queue directly

You can directly pass in an instance of the [Queue](Queue.md) construct.

```js {6}
import { Queue } from "@serverless-stack/resources";

const myQueue = new Queue(this, "MyQueue");

new Bucket(stack, "Bucket", {
  notifications: {
    myNotification: myQueue,
  },
});
```

#### Configuring the notification

```js {5-9}
const myQueue = new Queue(this, "MyQueue");

new Bucket(stack, "Bucket", {
  notifications: {
    myNotification: {
      queue: myQueue,
      events: ["object_created_put"],
      filters: [{ prefix: "imports/" }, { suffix: ".jpg" }],
    }
  },
});
```

### Configuring Topic notifications

#### Specifying the Topic directly

You can directly pass in an instance of the [Topic](Topic.md) construct.

```js {6}
import { Topic } from "@serverless-stack/resources";

const myTopic = new Topic(this, "MyTopic");

new Bucket(stack, "Bucket", {
  notifications: {
    myNotification: myTopic,
  },
});
```

#### Configuring the notification

```js {5-9}
const myTopic = new Topic(this, "MyTopic");

new Bucket(stack, "Bucket", {
  notifications: {
    myNotification: {
      topic: myTopic,
      events: ["object_created_put"],
      filters: [{ prefix: "imports/" }, { suffix: ".jpg" }],
    }
  },
});
```

### Configuring the S3 Bucket

Configure the internally created CDK `Bucket` instance.

```js {3-5}
new Bucket(stack, "Bucket", {
  cdk: {
    bucket: {
      bucketName: "my-bucket",
    },
  },
});
```

### Removing the S3 Bucket

Only empty S3 buckets can be deleted. However, you can configure the bucket to automatically delete all objects upon removal.

```js {5-8}
import * as cdk from "aws-cdk-lib";

new Bucket(stack, "Bucket", {
  cdk: {
    bucket: {
      autoDeleteObjects: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    },
  },
});
```

## BucketProps


### cors?

_Type_ : <span class='mono'><span class="mono">boolean</span> | <span class='mono'>Array&lt;<span class="mono">[BucketCorsRule](#bucketcorsrule)</span>&gt;</span></span>

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


The default function props to be applied to all the Lambda functions in the API. The `environment`, `permissions` and `layers` properties will be merged with per route definitions if they are defined.


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

_Type_ : <span class="mono">Record&lt;<span class="mono">string</span>, <span class='mono'><span class='mono'><span class="mono">string</span> | <span class="mono">[Function](Function#function)</span></span> | <span class="mono">[Queue](Queue#queue)</span> | <span class="mono">[Topic](Topic#topic)</span> | <span class="mono">[BucketFunctionNotificationProps](#bucketfunctionnotificationprops)</span> | <span class="mono">[BucketQueueNotificationProps](#bucketqueuenotificationprops)</span> | <span class="mono">[BucketTopicNotificationProps](#buckettopicnotificationprops)</span></span>&gt;</span>

Used to create notifications for various bucket events


```js
new Bucket(stack, "Bucket", {
  notifications: {
    myNotification: "src/notification.main",
  }
});
```


### cdk.bucket?

_Type_ : <span class='mono'><span class="mono">[Bucket](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_s3.Bucket.html)</span> | <span class="mono">[BucketProps](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_s3.BucketProps.html)</span></span>

Allows you to override default settings this construct uses internally to ceate the bucket


```js
new Bucket(stack, "Bucket", {
  cdk: {
    bucket: {
      bucketName: "my-bucket",
    },
  }
});
```


## Properties
An instance of `Bucket` has the following properties.
### bucketArn

_Type_ : <span class="mono">string</span>

The ARN of the internally created `Bucket` instance.

### bucketName

_Type_ : <span class="mono">string</span>

The name of the internally created `Bucket` instance.

### notificationFunctions

_Type_ : <span class='mono'>Array&lt;<span class="mono">[Function](Function#function)</span>&gt;</span>

A list of the internally created functions for the notifications.


### cdk.bucket

_Type_ : <span class="mono">[Bucket](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_s3.Bucket.html)</span>

The internally created CDK `Bucket` instance.


## Methods
An instance of `Bucket` has the following methods.
### addNotifications

```ts
addNotifications(scope, notifications)
```
_Parameters_
- __scope__ <span class="mono">[Construct](https://docs.aws.amazon.com/cdk/api/v2/docs/constructs.Construct.html)</span>
- __notifications__ <span class="mono">Record&lt;<span class="mono">string</span>, <span class='mono'><span class='mono'><span class="mono">string</span> | <span class="mono">[Function](Function#function)</span></span> | <span class="mono">[Queue](Queue#queue)</span> | <span class="mono">[Topic](Topic#topic)</span> | <span class="mono">[BucketFunctionNotificationProps](#bucketfunctionnotificationprops)</span> | <span class="mono">[BucketQueueNotificationProps](#bucketqueuenotificationprops)</span> | <span class="mono">[BucketTopicNotificationProps](#buckettopicnotificationprops)</span></span>&gt;</span>


Add notification subscriptions after the bucket has been created


```js {3}
const bucket = new Bucket(stack, "Bucket");
bucket.addNotifications(stack, ["src/notification.main"]);
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

bucket.attachPermissions("myNotification", ["s3"]);
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

_Type_ : <span class='mono'>Array&lt;<span class='mono'><span class="mono">"DELETE"</span> | <span class="mono">"GET"</span> | <span class="mono">"HEAD"</span> | <span class="mono">"POST"</span> | <span class="mono">"PUT"</span></span>&gt;</span>

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

_Type_ : <span class='mono'><span class="mono">${number} second</span> | <span class="mono">${number} seconds</span> | <span class="mono">${number} minute</span> | <span class="mono">${number} minutes</span> | <span class="mono">${number} hour</span> | <span class="mono">${number} hours</span> | <span class="mono">${number} day</span> | <span class="mono">${number} days</span></span>

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

_Type_ : <span class='mono'>Array&lt;<span class='mono'><span class="mono">"object_created"</span> | <span class="mono">"object_created_put"</span> | <span class="mono">"object_created_post"</span> | <span class="mono">"object_created_copy"</span> | <span class="mono">"object_created_complete_multipart_upload"</span> | <span class="mono">"object_removed"</span> | <span class="mono">"object_removed_delete"</span> | <span class="mono">"object_removed_delete_marker_created"</span> | <span class="mono">"object_restore_post"</span> | <span class="mono">"object_restore_completed"</span> | <span class="mono">"object_restore_delete"</span> | <span class="mono">"reduced_redundancy_lost_object"</span> | <span class="mono">"replication_operation_failed_replication"</span> | <span class="mono">"replication_operation_missed_threshold"</span> | <span class="mono">"replication_operation_replicated_after_threshold"</span> | <span class="mono">"replication_operation_not_tracked"</span> | <span class="mono">"lifecycle_expiration"</span> | <span class="mono">"lifecycle_expiration_delete"</span> | <span class="mono">"lifecycle_expiration_delete_marker_created"</span> | <span class="mono">"lifecycle_transition"</span> | <span class="mono">"intelligent_tiering"</span> | <span class="mono">"object_tagging"</span> | <span class="mono">"object_tagging_put"</span> | <span class="mono">"object_tagging_delete"</span> | <span class="mono">"object_acl_put"</span></span>&gt;</span>

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

_Type_ : <span class='mono'>Array&lt;<span class='mono'><span class="mono">"object_created"</span> | <span class="mono">"object_created_put"</span> | <span class="mono">"object_created_post"</span> | <span class="mono">"object_created_copy"</span> | <span class="mono">"object_created_complete_multipart_upload"</span> | <span class="mono">"object_removed"</span> | <span class="mono">"object_removed_delete"</span> | <span class="mono">"object_removed_delete_marker_created"</span> | <span class="mono">"object_restore_post"</span> | <span class="mono">"object_restore_completed"</span> | <span class="mono">"object_restore_delete"</span> | <span class="mono">"reduced_redundancy_lost_object"</span> | <span class="mono">"replication_operation_failed_replication"</span> | <span class="mono">"replication_operation_missed_threshold"</span> | <span class="mono">"replication_operation_replicated_after_threshold"</span> | <span class="mono">"replication_operation_not_tracked"</span> | <span class="mono">"lifecycle_expiration"</span> | <span class="mono">"lifecycle_expiration_delete"</span> | <span class="mono">"lifecycle_expiration_delete_marker_created"</span> | <span class="mono">"lifecycle_transition"</span> | <span class="mono">"intelligent_tiering"</span> | <span class="mono">"object_tagging"</span> | <span class="mono">"object_tagging_put"</span> | <span class="mono">"object_tagging_delete"</span> | <span class="mono">"object_acl_put"</span></span>&gt;</span>

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

_Type_ : <span class='mono'>Array&lt;<span class='mono'><span class="mono">"object_created"</span> | <span class="mono">"object_created_put"</span> | <span class="mono">"object_created_post"</span> | <span class="mono">"object_created_copy"</span> | <span class="mono">"object_created_complete_multipart_upload"</span> | <span class="mono">"object_removed"</span> | <span class="mono">"object_removed_delete"</span> | <span class="mono">"object_removed_delete_marker_created"</span> | <span class="mono">"object_restore_post"</span> | <span class="mono">"object_restore_completed"</span> | <span class="mono">"object_restore_delete"</span> | <span class="mono">"reduced_redundancy_lost_object"</span> | <span class="mono">"replication_operation_failed_replication"</span> | <span class="mono">"replication_operation_missed_threshold"</span> | <span class="mono">"replication_operation_replicated_after_threshold"</span> | <span class="mono">"replication_operation_not_tracked"</span> | <span class="mono">"lifecycle_expiration"</span> | <span class="mono">"lifecycle_expiration_delete"</span> | <span class="mono">"lifecycle_expiration_delete_marker_created"</span> | <span class="mono">"lifecycle_transition"</span> | <span class="mono">"intelligent_tiering"</span> | <span class="mono">"object_tagging"</span> | <span class="mono">"object_tagging_put"</span> | <span class="mono">"object_tagging_delete"</span> | <span class="mono">"object_acl_put"</span></span>&gt;</span>

The S3 event types that will trigger the notification.

### filters?

_Type_ : <span class='mono'>Array&lt;<span class="mono">[BucketFilter](#bucketfilter)</span>&gt;</span>

S3 object key filter rules to determine which objects trigger this event.

### function

_Type_ : <span class='mono'><span class="mono">string</span> | <span class="mono">[Function](Function#function)</span> | <span class="mono">[FunctionProps](Function#functionprops)</span></span>

The function to send notifications to

### type?

_Type_ : <span class="mono">"function"</span>

String literal to signify that the notification is a function
