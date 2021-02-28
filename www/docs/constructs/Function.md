---
description: "Docs for the sst.Function construct in the @serverless-stack/resources package"
---

import config from "../../config";

A replacement for the [`cdk.lambda.NodejsFunction`](https://docs.aws.amazon.com/cdk/api/latest/docs/aws-lambda-nodejs-readme.html) that allows you to [develop your Lambda functions locally](live-lambda-development.md). Supports ES and TypeScript out-of-the-box. It also applies a couple of defaults:

- Sets the default memory setting to 1024MB.
- Sets the default Lambda function timeout to 10 seconds.
- [Enables AWS X-Ray](https://docs.aws.amazon.com/lambda/latest/dg/nodejs-tracing.html) by default so you can trace your serverless applications.
- `AWS_NODEJS_CONNECTION_REUSE_ENABLED` is turned on. Meaning that the Lambda function will automatically reuse TCP connections when working with the AWS SDK. [Read more about this here](https://docs.aws.amazon.com/sdk-for-javascript/v2/developer-guide/node-reusing-connections.html).

## Initializer

```ts
new Function(scope: Construct, id: string, props: FunctionProps)
```

_Parameters_

- scope [`Construct`](https://docs.aws.amazon.com/cdk/api/latest/docs/constructs.Construct.html)
- id `string`
- props [`FunctionProps`](#functionprops)

## Examples

### Creating a Function

```js
new Function(this, "MySnsLambda", {
  handler: "src/sns/index.main",
});
```

### Disabling bundling

```js
new Function(this, "MySnsLambda", {
  bundle: false,
  srcPath: "src/",
  handler: "sns/index.main",
});
```

In this case, SST will zip the entire `src/` directory for the Lambda function.

### Setting additional props

Use the [`cdk.lambda.FunctionOptions`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-lambda.FunctionOptions.html) to set additional props.

```js
new Function(this, "MyApiLambda", {
  handler: "src/api.main",
  timeout: 10,
  environment: {
    TABLE_NAME: "notes",
  },
});
```

## Properties

Refer to the properties made available by [`cdk.lambda.Function`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-lambda.Function.html#properties).

## Methods

An instance of `Function` contains the following methods.

### attachPermissions

```ts
attachPermissions(permissions: Permissions)
```

_Parameters_

- **permissions** [`Permissions`](../util/Permissions.md#permissions)

Attaches the given list of [permissions](../util/Permissions.md#permissions) to the function. This method makes it easy to control the permissions you want the function to have access to. It can range from complete access to all AWS resources, all the way to a specific permission for a resource.

Let's look at this in detail. Below are the many ways to attach permissions. Starting with the most permissive option.

Start with a simple function.

```js
const fun = new Function(this, "Function", { handler: "src/lambda.main" });
```

1. Giving full permissions

   ```js
   fun.attachPermissions(PermissionType.ALL);
   ```

   This allows the function admin access to all resources.

2. Access to a list of services

   ```js
   fun.attachPermissions(["s3", "dynamodb"]);
   ```

   Specify a list of AWS resource types that this function has complete access to. Takes a list of strings.

3. Access to a list of constructs

   ```js
   const sns = new sns.Topic(this, "Topic");
   const table = new sst.Table(this, "Table");

   fun.attachPermissions([sns, table]);
   ```

   Specify which resource constructs you want to give complete access to. Currently supports:

   - [Topic](Topic.md)
   - [Table](Table.md)
   - [Queue](Queue.md)
   - [cdk.aws-sns.Topic](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-sns.Topic.html)
   - [cdk.aws-s3.Bucket](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-s3.Bucket.html)
   - [cdk.aws-sqs.Queue](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-sqs.Queue.html)
   - [cdk.aws-dynamodb.Table](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-dynamodb.Table.html)

   To add to this list, please <a href={ `${config.github}/issues/new` }>open a new issue</a>.

4. Access to a list of specific permissions in a construct

   ```js
   const sns = new sns.Topic(this, "Topic");
   const table = new dynamodb.Table(this, "Table");

   fun.attachPermissions([
     [topic, "grantPublish"],
     [table, "grantReadData"],
   ]);
   ```

   Specify which permission in the construct you want to give access to. Specified as a tuple of construct and a grant permission function.

   CDK constructs have methods of the format _grantX_ that allow you to grant specific permissions. So in the example above, the grant functions are: [`Topic.grantPublish`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-sns.Topic.html#grantwbrpublishgrantee) and [`Table.grantReadData`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-dynamodb.Table.html#grantwbrreadwbrdatagrantee). The `attachPermissions` method, takes the construct and calls the grant permission function specified.

   Unlike option #3, this supports all the CDK constructs.

5. A list of IAM policies

   ```js
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
       resources: [
         `arn:aws:execute-api:${region}:${account}:${api.httpApiId}/*`,
       ],
     }),
   ]);
   ```

   The [`cdk.aws-iam.PolicyStatement`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-iam.PolicyStatement.html) allows you to craft granular IAM policies that you can attach to the function.

## FunctionProps

Takes the following construct props in addition to the [`cdk.lambda.FunctionOptions`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-lambda.FunctionOptions.html).

### handler

_Type_ : `string`

Path to the entry point and handler function. Uses the format, `/path/to/file.function`. Where the first part is the path to the file, followed by the name of the function that's exported in that file.

For example, if your handler file is in `src/lambda.js` and it exported a function called `main`. The `handler` would be `src/lambda.main`.

First checks for a `.ts` file and then for a `.js` file.

If the [`srcPath`](#srcpath) is set, then the path to the `handler` is relative to it. So if the `srcPath` is set to `src`. Then `lambda.main` as the `handler` would mean that the file is in `src/lambda.js` (or `.ts`).

### bundle?

_Type_ : `boolean`, _defaults to_ `true`

Bundles your Lambda functions with [esbuild](https://esbuild.github.io). Turn this off if you have npm packages that cannot be bundled. Currently bundle cannot be disabled if the `srcPath` is set to the project root. [Read more about this here](https://github.com/serverless-stack/serverless-stack/issues/78).

### srcPath?

_Type_ : `string`, _defaults to the project root_

If the [`bundle`](#bundle) option is not being used, SST zips up this directory for the Lambda function package.

For TypeScript projects, SST expects the `tsconfig.json` to be in this directory. By default, this is the project root.

### memorySize?

_Type_ : `number`, _defaults to 1024_

The amount of memory in MB allocated to this function.

### timeout?

_Type_ : `number`, _defaults to 10_

The function execution timeout in seconds.

### runtime?

_Type_ : [`cdk.lambda.Runtime`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-lambda.Runtime.html), _defaults to_ `cdk.lambda.Runtime.NODEJS_12_X`

The runtime environment. Only runtimes of the Node.js family are supported.

### tracing?

_Type_ : [`cdk.lambda.Tracing`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-lambda.Tracing.html), _defaults to_ `cdk.lambda.Tracing.ACTIVE`

Turns on [AWS X-RAY for the Lambda function](https://docs.aws.amazon.com/lambda/latest/dg/nodejs-tracing.html), to enable tracing.

## FunctionDefinition

_Type_ : `string | Function | FunctionProps`

All the high-level SST constructs that create a function internally accepts this as a type. So you can define a function by passing in the [handler](#handler) as a string:

```js
src / create.main;
```

Or the [`FunctionProps`](#functionprops):

```js
{
  bundle: false,
  srcPath: "src/",
  handler: "sns/index.main",
}
```

Or an instance of the Function itself.

```js
new Function(this, "Create", {
  handler: "src/create.main",
});
```
