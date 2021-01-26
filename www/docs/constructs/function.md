---
id: function
title: "Function"
description: "Docs for the sst.Function construct in the @serverless-stack/resources package"
---

A replacement for the [`cdk.lambda.NodejsFunction`](https://docs.aws.amazon.com/cdk/api/latest/docs/aws-lambda-nodejs-readme.html) that allows you to [develop your Lambda functions locally](live-lambda-development.md). Supports ES and TypeScript out-of-the-box.

By default, `AWS_NODEJS_CONNECTION_REUSE_ENABLED` is turned on. Meaning that the Lambda function will automatically reuse TCP connections when working with the AWS SDK. [Read more about this here](https://docs.aws.amazon.com/sdk-for-javascript/v2/developer-guide/node-reusing-connections.html).

Also, [enables AWS X-Ray](https://docs.aws.amazon.com/lambda/latest/dg/nodejs-tracing.html) by default so you can trace your serverless applications.

## Initializer

```ts
new Function(scope: Construct, id: string, props: FunctionProps)
```

_Parameters_

- scope [`Construct`](https://docs.aws.amazon.com/cdk/api/latest/docs/constructs.Construct.html)
- id `string`
- props [`FunctionProps`](#funcionprops)

## Properties

Refer to the properties made available by [`cdk.lambda.Function`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-lambda.Function.html#properties).

## FunctionProps

Takes the following construct props in addition to the [`cdk.lambda.FunctionOptions`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-lambda.FunctionOptions.html).

### handler

_Type_: `string`

Path to the entry point and handler function. Uses the format, `/path/to/file.function`. Where the first part is the path to the file, followed by the name of the function that's exported in that file.

For example, if your handler file is in `src/lambda.js` and it exported a function called `main`. The `handler` would be `src/lambda.main`.

First checks for a `.ts` file and then for a `.js` file.

If the [`srcPath`](#srcpath) is set, then the path to the `handler` is relative to it. So if the `srcPath` is set to `src`. Then `lambda.main` as the `handler` would mean that the file is in `src/lambda.js` (or `.ts`).

### bundle?

_Type_: `boolean`, _defaults to_ `true`

Bundles your Lambda functions with [esbuild](https://esbuild.github.io). Turn this off if you have npm packages that cannot be bundled.

### srcPath?

_Type_: `string`, _defaults to the project root_

The source directory where the handler file is located. If the `bundle` option is turned off, SST zips up the entire `srcPath` directory and uses it as the Lambda function package. This doesn't need to be set if `bundle` is turned on.

### runtime?

_Type_: [`cdk.lambda.Runtime`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-lambda.Runtime.html), _defaults to_ `cdk.lambda.Runtime.NODEJS_12_X`

The runtime environment. Only runtimes of the Node.js family are supported.

### tracing?

_Type_: [`cdk.lambda.Tracing`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-lambda.Tracing.html), _defaults to_ `cdk.lambda.Tracing.ACTIVE`

Turns on [AWS X-RAY for the Lambda function](https://docs.aws.amazon.com/lambda/latest/dg/nodejs-tracing.html), to enable tracing.

## Examples

### Creating a Function

```js
new Function(this, "MySnsLambda", {
  handler: "src/sns/index.handler",
});
```

### Disabling bundling

```js
new Function(this, "MySnsLambda", {
  bundle: false,
  srcPath: "src/",
  handler: "sns/index.handler",
});
```

In this case, SST will zip the entire `src/` directory for the Lambda function.

### Setting additional props

Use the [`cdk.lambda.FunctionOptions`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-lambda.FunctionOptions.html) to set additional props.

```js
new Function(this, "MyApiLambda", {
  handler: "src/api.main",
  timeout: cdk.Duration.seconds(10),
  environment: {
    TABLE_NAME: "notes",
  },
});
```
