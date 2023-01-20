---
description: "Docs for how permissions are handled in the sst/constructs"
---

import config from "../../config";

SST makes it easy to select the level of access you want to grant while attaching permissions to your application.

The `Permissions` type is used in:

1. The various `attachPermissions` style functions. For example, [`attachPermissions`](Function.md#attachpermissions) in the `Function` construct.
2. The [`attachPermissionsForAuthUsers`](Cognito.md#attachpermissionsforauthusers) and [`attachPermissionsForUnauthUsers`](Cognito.md#attachpermissionsforunauthusers) in the `Cognito` construct.

## Examples

Let's look at the various ways to attach permissions. Starting with the most permissive option.

Take a simple function.

```js
const fun = new Function(stack, "Function", { handler: "src/lambda.main" });
```

### Giving full permissions

```js
fun.attachPermissions("*");
```

This allows the function admin access to all resources.

### Access to a list of services

```js
fun.attachPermissions(["s3", "dynamodb"]);
```

Specify a list of AWS resource types that this function has complete access to. Takes a list of strings.

### Access to a list of actions

```js
fun.attachPermissions(["s3:PutObject", "dynamodb:PutItem"]);
```

Specify a list of AWS IAM actions that this function has complete access to. Takes a list of strings.

### Access to a list of SST constructs

```js
import { Topic, Table } from "sst/constructs";

const topic = new topic(stack, "Topic");
const table = new Table(stack, "Table");

fun.bind([topic, table]);
```

To give access to SST constructs, bind them to the function. [Read more about Resource Binding](../resource-binding.md).

### Access to a list of CDK constructs

```js
import * as sns from "aws-cdk-lib/aws-sns";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";

const topic = new sns.Topic(stack, "Topic");
const table = new dynamodb.Table(stack, "Table");

fun.attachPermissions([topic, table]);
```

Specify which CDK constructs you want to give complete access to. [Check out the list of supported constructs](#supported-constructs).

### Access to a list of specific permissions in a construct

```js
import * as sns from "aws-cdk-lib/aws-sns";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";

const topic = new sns.Topic(stack, "Topic");
const table = new dynamodb.Table(stack, "Table");

fun.attachPermissions([
  [topic, "grantPublish"],
  [table, "grantReadData"],
]);
```

Specify which permission in the construct you want to give access to. Specified as a tuple of construct and a grant permission function.

CDK constructs have methods of the format _grantX_ that allow you to grant specific permissions. So in the example above, the grant functions are: [`Topic.grantPublish`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_sns.Topic.html#grantwbrpublishgrantee) and [`Table.grantReadData`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_dynamodb.Table.html#grantwbrreadwbrdatagrantee). The `attachPermissions` method, takes the construct and calls the grant permission function specified.

Unlike the previous option, this supports all the CDK constructs.

### List of IAM policies

```js
import * as iam from "aws-cdk-lib/aws-iam";

fun.attachPermissions([
  new iam.PolicyStatement({
    actions: ["s3:*"],
    effect: iam.Effect.ALLOW,
    resources: [
      bucket.bucketArn + "/private/${cognito-identity.amazonaws.com:sub}/*",
    ],
  }),
  new iam.PolicyStatement({
    actions: ["execute-api:Invoke"],
    effect: iam.Effect.ALLOW,
    resources: [`arn:aws:execute-api:${region}:${account}:${api.httpApiId}/*`],
  }),
]);
```

The [`cdk.aws-iam.PolicyStatement`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_iam.PolicyStatement.html) allows you to craft granular IAM policies that you can attach to the function.

## Types

Below are the types and enums used to support permissions in SST.

### Permissions

_Type_ : `"*" | Permission[]`

Takes a `*` or an array of [`Permission`](#permission).

On a high level, you can either give admin access to all the resources in your account or a specific list of services.

### Permission

_Type_ : `string | cdk.IConstruct | [cdk.IConstruct, string] | cdk.aws-iam.PolicyStatement`

Allows you to define the permission in a few different ways to control the level of access.

The name of the AWS resource as referenced in an IAM policy.

```
"s3"
"dynamodb"
...
```

A CDK construct. [Check out the list of supported constructs](#supported-constructs).

```
new cdk.aws-sns.Topic(stack, "Topic")
new cdk.aws-dynamodb.Table(stack, "Table")
...
```

A CDK construct with their specific grant permission method. Many CDK constructs have a method of the format _grantX_ that allows you to grant specific permissions. Pass in the consutrct and grant method as a tuple.

```
// const topic = new cdk.aws-sns.Topic(stack, "Topic");
// const table = new sst.Table(stack, "Table");

[topic, "grantPublish"]
[table, "grantReadData"]
```

Or, pass in a policy statement.

```
new cdk.aws-iam.PolicyStatement({
  actions: ["s3:*"],
  effect: cdk.aws-iam.Effect.ALLOW,
  resources: [
    bucket.bucketArn + "/private/${cognito-identity.amazonaws.com:sub}/*",
  ],
})
```

#### Supported Constructs

You can grant access to an CDK construct.

```js
fun.attachPermissions([topic, table]);
```

Currently the following CDK constructs are supported.

- [cdk.aws-sns.Topic](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_sns.Topic.html)
- [cdk.aws-s3.Bucket](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_s3.Bucket.html)
- [cdk.aws-sqs.Queue](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_sqs.Queue.html)
- [cdk.aws-dynamodb.Table](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_dynamodb.Table.html)
- [cdk.aws-kinesis.Stream](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_kinesis.Stream.html)
- [cdk.aws-events.EventBus](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_events.EventBus.html)
- [cdk.aws-rds.ServerlessCluster](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_rds.ServerlessCluster.html)
- [cdk.aws-kinesisfirehose-alpha.DeliveryStream](https://docs.aws.amazon.com/cdk/api/v2/docs/@aws-cdk_aws-kinesisfirehose-alpha.DeliveryStream.html)

To add to this list, please <a href={ `${config.github}/issues/new` }>open a new issue</a>.
