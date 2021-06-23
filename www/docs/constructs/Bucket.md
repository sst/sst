---
description: "Docs for the sst.Bucket construct in the @serverless-stack/resources package. This construct creates an S3 Bucket."
---

The `Bucket` construct is a higher level CDK construct that makes it easy to create an S3 Bucket and to define its notifications. It also internally connects the notifications and bucket together.

## Initializer

```ts
new Bucket(scope: Construct, id: string, props: BucketProps)
```

_Parameters_

- scope [`Construct`](https://docs.aws.amazon.com/cdk/api/latest/docs/constructs.Construct.html)
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
import { EventType } from "@aws-cdk/aws-s3";

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

#### Lazily adding notifications

Create an _empty_ bucket and lazily add the notifications.

```js {3}
const bucket = new Bucket(this, "Bucket");

bucket.addNotifications(this, ["src/notification.main"]);
```

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
import { EventType } from "@aws-cdk/aws-s3";

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
import { EventType } from "@aws-cdk/aws-s3";

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
  s3Bucket: {
    bucketName: "my-bucket",
  },
});
```

### Removing the S3 Bucket

Only empty S3 buckets can be deleted. However, you can configure the bucket to automatically delete all objects upon removal.

```js {5-6}
import * as cdk from "@aws-cdk/core";

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
import { EventType } from "@aws-cdk/aws-s3";

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

_Type_ : [`cdk.aws-s3.Bucket`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-s3.Bucket.html)

The internally created CDK `Bucket` instance.

### notificationFunctions

_Type_ : `Function[]`

A list of the internally created [`Function`](Function.md) instances for the notifications.

## Methods

An instance of `Bucket` contains the following methods.

### addNotifications

```ts
addNotifications(scope: cdk.Construct, notifications: (FunctionDefinition | BucketNotificationProps)[])
```

_Parameters_

- **scope** `cdk.Construct`
- **notifications** `(FunctionDefinition | BucketNotificationProps)[]`

A list of [`FunctionDefinition`](Function.md#functiondefinition) or [`BucketNotificationProps`](#bucketnotificationprops) that'll be used to create the notifications for the bucket.

### attachPermissions

```ts
attachPermissions(permissions: Permissions)
```

_Parameters_

- **permissions** [`Permissions`](../util/Permissions.md#permissions)

Attaches the given list of [permissions](../util/Permissions.md#permissions) to all the `notificationFunctions`. This allows the notifications to access other AWS resources.

Internally calls [`Function.attachPermissions`](Function.md#attachpermissions).

### attachPermissionsToNotification

```ts
attachPermissions(index: number, permissions: Permissions)
```

_Parameters_

- **index** `number`

- **permissions** [`Permissions`](../util/Permissions.md#permissions)

Attaches the given list of [permissions](../util/Permissions.md#permissions) to a specific function in the list of `notificationFunctions`. Where `index` (starting at 0) is used to identify the notification. This allows that notification to access other AWS resources.

Internally calls [`Function.attachPermissions`](Function.md#attachpermissions).

## BucketProps

### notifications?

_Type_ : `(FunctionDefinition | BucketNotificationProps)[]`, _defaults to_ `[]`

A list of [`FunctionDefinition`](Function.md#functiondefinition) or [`BucketNotificationProps`](#bucketnotificationprops) that'll be used to create the notifications for the bucket.

### s3Bucket?

_Type_ : `cdk.aws-s3.Bucket | cdk.aws-s3.BucketProps`, _defaults to_ `undefined`

Optionally pass in a CDK [`cdk.aws-s3.BucketProps`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-s3.BucketProps.html) or a [`cdk.aws-s3.Bucket`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-s3.Bucket.html) instance. This allows you to override the default settings this construct uses internally to create the bucket.

### defaultFunctionProps?

_Type_ : [`FunctionProps`](Function.md#functionprops), _defaults to_ `{}`

The default function props to be applied to all the Lambda functions in the Bucket. If the `function` is specified for a notification, these default values are overridden. Except for the `environment`, the `layers`, and the `permissions` properties, that will be merged.

## BucketNotificationProps

### function

_Type_ : `FunctionDefinition`

A [`FunctionDefinition`](Function.md#functiondefinition) object that'll be used to create the notification function for the bucket.

### notificationProps?

_Type_ : [`cdk.aws-lambda-event-sources.lambdaEventSources.S3EventSourceProps`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-lambda-event-sources.S3EventSourceProps.html), _defaults to_ `S3EventSourceProps` with events set to `[OBJECT_CREATED, OBJECT_REMOVED]`

Optionally pass in a CDK `S3EventSourceProps`. This allows you to override the default settings this construct uses internally to create the notification.
