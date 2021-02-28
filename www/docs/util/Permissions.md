---
description: "Docs for how permissions are handled in the @serverless-stack/resources"
---

A set of types and enums used to support permissions in SST.

## Permissions

_Type_ : `PermissionType | Permission[]`

Takes a [`PermissionType`](#permissiontype) or an array of [`Permission`](#permission).

## PermissionType

An enum with the following option(s).

| Member | Description                                   |
| ------ | --------------------------------------------- |
| ALL    | Gives complete admin access to all resources. |

For example, `sst.PermissionType.ALL`.

## Permission

_Type_ : `string | cdk.Construct | [cdk.Construct, string] | cdk.aws-iam.PolicyStatement`

Allows you to define the permission in a few different ways to control the level of access.

The name of the AWS resource as referenced in an IAM policy.

```
"s3"
"dynamodb"
...
```

A CDK or SST construct.

```
new cdk.aws-sns.Topic(this, "Topic")
new sst.Table(this, "Table")
...
```

A CDK construct with their specific grant permission method. Many CDK constructs have a method of the format _grantX_ that allows you to grant specific permissions. Pass in the consutrct and grant method as a tuple.

```
// const sns = new cdk.aws-sns.Topic(this, "Topic");
// const table = new sst.Table(this, "Table");

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
