---
description: "Snippets for the sst.Bucket construct"
---

## Using the minimal config

```js
import { Bucket } from "@serverless-stack/resources";

new Bucket(this, "Bucket");
```

## Enabling S3 Event Notifications

### Using the minimal config

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

## Lazily adding notifications

Create an _empty_ bucket and lazily add the notifications.

```js {3}
const bucket = new Bucket(this, "Bucket");

bucket.addNotifications(this, ["src/notification.main"]);
```

## Configuring Function notifications

### Specifying function props for all the notifications

You can extend the minimal config, to set some function props and have them apply to all the notifications.

```js {2-6}
new Bucket(this, "Bucket", {
  defaults: {
    function: {
      timeout: 20,
      environment: { tableName: table.tableName },
      permissions: [table],
    },
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

### Using the full config

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
  defaults: {
    function: {
      timeout: 20,
      environment: { tableName: table.tableName },
      permissions: [table],
    },
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

## Configuring Queue notifications

### Specifying the Queue directly

You can directly pass in an instance of the [Queue](Queue.md) construct.

```js {6}
import { Queue } from "@serverless-stack/resources";

const myQueue = new Queue(this, "MyQueue");

new Bucket(this, "Bucket", {
  notifications: [myQueue],
});
```

### Configuring the notification

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

## Configuring Topic notifications

### Specifying the Topic directly

You can directly pass in an instance of the [Topic](Topic.md) construct.

```js {6}
import { Topic } from "@serverless-stack/resources";

const myTopic = new Topic(this, "MyTopic");

new Bucket(this, "Bucket", {
  notifications: [myTopic],
});
```

### Configuring the notification

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

## Configuring the S3 Bucket

Configure the internally created CDK `Bucket` instance.

```js {2-4}
new Bucket(this, "Bucket", {
  s3Bucket: {
    bucketName: "my-bucket",
  },
});
```

## Removing the S3 Bucket

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

## Configuring a notification

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
