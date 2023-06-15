---
description: "Docs for the sst.Bucket construct in the @serverless-stack/resources package. This construct creates an S3 Bucket."
---

:::caution
This is the SST v0.x Constructs doc. SST v1 is now released. If you are using v1, see the [v1 Constructs doc](/constructs). If you are looking to upgrade to v1, [check out the migration steps](/constructs/v0/migration).
:::

The `Bucket` construct is a higher level CDK construct that makes it easy to create an S3 Bucket and to define its notifications. It also internally connects the notifications and bucket together.

## Initializer

```ts
new Bucket(scope: Construct, id: string, props: BucketProps)
```

_Parameters_

- scope [`Construct`](https://docs.aws.amazon.com/cdk/api/v2/docs/constructs.Construct.html)
- id `string`
- props [`BucketProps`](#bucketprops)

## Examples

### Using the minimal config

```js
import { Bucket } from "@serverless-stack/resources";

new Bucket(this, "Bucket");
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

### Lazily adding notifications

Create an _empty_ bucket and lazily add the notifications.

```js {3}
const bucket = new Bucket(this, "Bucket");

bucket.addNotifications(this, ["src/notification.main"]);
```

### Configuring Function notifications

#### Specifying function props for all the notifications

You can extend the minimal config, to set some function props and have them apply to all the notifications.

```js {2-6}
new Bucket(this, "Bucket", {
  defaultFunctionProps: {
    timeout: 20,
    environment: { tableName: table.tableName },
    permissions: [table],
  },
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

#### Using the full config

If you wanted to configure each Lambda function separately, you can pass in the [`BucketNotificationProps`](#bucketnotificationprops).

```js
new Bucket(this, "Bucket", {
  notifications: [
    {
      function: {
        srcPath: "src/",
        handler: "notification.main",
        environment: { tableName: table.tableName },
        permissions: [table],
      },
      notificationProps: {
        events: [EventType.OBJECT_CREATED],
      },
    },
  ],
});
```

Note that, you can set the `defaultFunctionProps` while using the `function` per notification. The `function` will just override the `defaultFunctionProps`. Except for the `environment`, the `layers`, and the `permissions` properties, that will be merged.

```js
new Bucket(this, "Bucket", {
  defaultFunctionProps: {
    timeout: 20,
    environment: { tableName: table.tableName },
    permissions: [table],
  },
  notifications: [
    {
      function: {
        handler: "src/notification1.main",
        timeout: 10,
        environment: { bucketName: bucket.bucketName },
        permissions: [bucket],
      },
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

So in the above example, the `notification1` function doesn't use the `timeout` that is set in the `defaultFunctionProps`. It'll instead use the one that is defined in the function definition (`10 seconds`). And the function will have both the `tableName` and the `bucketName` environment variables set; as well as permissions to both the `table` and the `bucket`.

#### Giving the notifications some permissions

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

#### Giving a specific notification some permissions

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
      type: 'queue',
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

### Configuring the S3 Bucket

Configure the internally created CDK `Bucket` instance.

```js {2-4}
new Bucket(this, "Bucket", {
  s3Bucket: {
    bucketName: "my-bucket",
  },
});
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

### Configuring a notification

Configure the internally created CDK `Notification`.

```js {5-11}
import { EventType } from "aws-cdk-lib/aws-s3";

new Bucket(this, "Bucket", {
  notifications: [
    {
      function: "src/notification.main",
      notificationProps: {
        events: [EventType.OBJECT_CREATED_PUT],
        filters: [{ prefix: "imports/" }, { suffix: ".jpg" }],
      },
    },
  ],
});
```

## Properties

An instance of `Bucket` contains the following properties.

### bucketArn

_Type_: `string`

The ARN of the internally created CDK `Bucket` instance.

### bucketName

_Type_: `string`

The name of the internally created CDK `Bucket` instance.

### s3Bucket

_Type_ : [`cdk.aws-s3.Bucket`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_s3.Bucket.html)

The internally created CDK `Bucket` instance.

### notificationFunctions

_Type_ : `Function[]`

A list of the internally created [`Function`](Function.md) instances for the notifications.

## Methods

An instance of `Bucket` contains the following methods.

### addNotifications

```ts
addNotifications(scope: cdk.Construct, notifications: (FunctionDefinition | BucketFunctionNotificationProps | Queue | BucketQueueNotificationProps | Topic | BucketTopicNotificationProps)[])
```

_Parameters_

- **scope** `cdk.Construct`
- **notifications** `(FunctionDefinition | BucketFunctionNotificationProps | Queue | BucketQueueNotificationProps | Topic | BucketTopicNotificationProps)[]`

A list of [`FunctionDefinition`](Function.md#functiondefinition), [`BucketFunctionNotificationProps`](#bucketfunctionnotificationprops), [`Queue`](Queue.md), [`BucketQueueNotificationProps`](#bucketqueuenotificationprops), [`Topic`](Topic.md), or [`BucketTopicNotificationProps`](#buckettopicnotificationprops) that'll be used to create the notifications for the bucket.

### attachPermissions

```ts
attachPermissions(permissions: Permissions)
```

_Parameters_

- **permissions** [`Permissions`](./Permissions)

Attaches the given list of [permissions](./Permissions) to all the `notificationFunctions`. This allows the notifications to access other AWS resources.

Internally calls [`Function.attachPermissions`](Function.md#attachpermissions).

### attachPermissionsToNotification

```ts
attachPermissions(index: number, permissions: Permissions)
```

_Parameters_

- **index** `number`

- **permissions** [`Permissions`](./Permissions)

Attaches the given list of [permissions](./Permissions) to a specific function in the list of `notificationFunctions`. Where `index` (starting at 0) is used to identify the notification. This allows that notification to access other AWS resources.

Internally calls [`Function.attachPermissions`](Function.md#attachpermissions).

## BucketProps

### notifications?

_Type_ : `(FunctionDefinition | BucketFunctionNotificationProps | Queue | BucketQueueNotificationProps | Topic | BucketTopicNotificationProps)[]`, _defaults to_ `[]`

A list of [`FunctionDefinition`](Function.md#functiondefinition), [`BucketFunctionNotificationProps`](#bucketfunctionnotificationprops), [`Queue`](Queue.md), [`BucketQueueNotificationProps`](#bucketqueuenotificationprops), [`Topic`](Topic.md), or [`BucketTopicNotificationProps`](#buckettopicnotificationprops) that'll be used to create the notifications for the bucket.

### s3Bucket?

_Type_ : `cdk.aws-s3.Bucket | cdk.aws-s3.BucketProps`, _defaults to_ `undefined`

Optionally pass in a CDK [`cdk.aws-s3.BucketProps`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_s3.BucketProps.html) or a [`cdk.aws-s3.Bucket`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_s3.Bucket.html) instance. This allows you to override the default settings this construct uses internally to create the bucket.

### defaultFunctionProps?

_Type_ : [`FunctionProps`](Function.md#functionprops), _defaults to_ `{}`

The default function props to be applied to all the Lambda functions in the Bucket. If the `function` is specified for a notification, these default values are overridden. Except for the `environment`, the `layers`, and the `permissions` properties, that will be merged.

## BucketFunctionNotificationProps

### function

_Type_ : `FunctionDefinition`

A [`FunctionDefinition`](Function.md#functiondefinition) object that'll be used to create the notification function for the bucket.

### notificationProps?

_Type_ : [`BucketNotificationProps`](#bucketnotificationprops), _defaults to_ events set to `[OBJECT_CREATED, OBJECT_REMOVED]`

Optionally pass in a `BucketNotificationProps`. This allows you to configure the S3 events and key filter rules that will trigger the notification.

## BucketQueueNotificationProps

### queue

_Type_ : `Queue`

A [`Queue`](Queue.md) object that'll be used to create the notification queue for the bucket.

### notificationProps?

_Type_ : [`BucketNotificationProps`](#bucketnotificationprops), _defaults to_ events set to `[OBJECT_CREATED, OBJECT_REMOVED]`

Optionally pass in a `BucketNotificationProps`. This allows you to configure the S3 events and key filter rules that will trigger the notification.

## BucketTopicNotificationProps

### topic

_Type_ : `Topic`

A [`Topic`](Topic.md) object that'll be used to create the notification topic for the bucket.

### notificationProps?

_Type_ : [`BucketNotificationProps`](#bucketnotificationprops), _defaults to_ events set to `[OBJECT_CREATED, OBJECT_REMOVED]`

Optionally pass in a `BucketNotificationProps`. This allows you to configure the S3 events and key filter rules that will trigger the notification.

## BucketNotificationProps

### events?

_Type_ : [`cdk.aws-s3.EventType`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_s3.EventType.html), _defaults to `[OBJECT_CREATED, OBJECT_REMOVED]`_

The S3 event types that will trigger the notification.

### filters?

_Type_ : [`cdk.aws-s3.NotificationKeyFilter`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_s3.NotificationKeyFilter.html), _defaults to no filters_

S3 object key filter rules to determine which objects trigger this event.
