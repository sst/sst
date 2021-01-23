---
id: api
title: "sst.Api"
description: "Docs for the sst.Api construct in the @serverless-stack/resources package"
---

The `sst.Api` construct is a higher level CDK construct that makes it easy to create an API. It provides a simple way to define the routes in your API. And allows you to configure the specific Lambda functions if necessary. See the [examples](#examples) for more details.

Unlike the lower level [`sst.Function`](function.md) construct, the `sst.Api` construct doesn't directly extend a CDK construct, it wraps around a couple of them.

## Construct Props

### routes

_Type_: `{ [key: string]: string }` or [`{ [key: string]: RouteProps }`](#routeprops)

The routes for this API. Takes an associative array, with the key being the route and the value is either the handler of the Lambda function.

```js
{
  "GET /notes": "src/list.main",
  "GET /notes/{id}": "src/get.main",
}
```

Or a the [RouteProps](#routeprops).

```js
{
  "GET /notes": {
    authorizationType: "AWS_IAM",
    lambdaProps: {
      handler: "src/list.main",
      environment: {
        TABLE_NAME: "notesTable",
      },
    }
  },
}
```

### cors?

_Type_: `boolean`, _defaults to_ `true`

CORS support for all the endpoints in the API.

### accessLog?

_Type_: `boolean`, _defaults to_ `true`

CloudWatch access logs for the API.

### httpApiProps?

_Type_: [`cdk.aws-apigatewayv2.HttpApiProps`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-apigatewayv2.HttpApiProps.html), _defaults to_ `{}`

Set the props for the [`cdk.aws-apigatewayv2.HttpApi`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-apigatewayv2.HttpApi.html) this construct creates internally.

### defaultLambdaProps?

_Type_: [`sst.FunctionProps`](function.md#construct-props), _defaults to_ `{}`

The default function props to be applied to all the Lambda functions in the API. If the `lambdaProps` are specified per route, the default values are overridden.

### defaultAuthorizationType?

_Type_: `string`, _defaults to_ `true`

The authorization type for all the endpoints in the API. Currently, supports `NONE` or `AWS_IAM`.

## Properties

### httpApi

_Type_: [`cdk.aws-apigatewayv2.HttpApi`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-apigatewayv2.HttpApi.html)

The internally created `HttpApi` instance.

### accessLogGroup?

_Type_: [`cdk.aws-logs.LogGroup`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-logs.LogGroup.html)

If access logs are enabled, this is the internally created `LogGroup` instance.

## Methods

### getFunction

```ts
getFunction(routeKey: string): sst.Function
```

_Parameters_

- **routeKey** `string`

_Returns_

- [`sst.Function`](function.md)

Get the instance of the internally created [`sst.Function`](function.md), for a given route key. Where the `routeKey` is the key used to define a route. For example, `GET /notes`.

## RouteProps

### lambdaProps?

_Type_: [`sst.FunctionProps`](function.md#construct-props), _defaults to_ `{}`

The function props for this specific route.

### authorizationType?

_Type_: `string`, _defaults to_ `NONE`

The authorization type for the specific route. Curently, supports `NONE` or `AWS_IAM`.

## Examples

The `sst.Api` construct is designed to make it easy to get started it with, while allowing for a way to fully configure it as well. Let's look at how, through a couple of examples.

### Using the minimal config

```js
const api = new Api(this, "Api", {
  routes: {
    "GET    /notes": "src/list.main",
    "POST   /notes": "src/create.main",
    "GET    /notes/{id}": "src/get.main",
    "PUT    /notes/{id}": "src/update.main",
    "DELETE /notes/{id}": "src/delete.main",
  },
});
```

Note that, the route key can have extra spaces in between, they are just ignored.

### Specifying function props for all the routes

You can extend the minimal config, to set some function props and have them apply to all the routes.

```js
const api = new Api(this, "Api", {
  defaultLambdaProps: {
    srcPath: "src/",
    environment: { tableName: table.tableName },
    initialPolicy: [
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          "dynamodb:Scan",
          "dynamodb:Query",
          "dynamodb:GetItem",
          "dynamodb:PutItem",
          "dynamodb:UpdateItem",
          "dynamodb:DeleteItem",
          "dynamodb:DescribeTable",
        ],
        resources: [table.tableArn],
      }),
    ],
  },
  defaultAuthorizationType: "AWS_IAM",
  routes: {
    "GET  /notes": "list.main",
    "POST /notes": "create.main",
  },
});
```

### Using the full config

Finally, if you wanted to configure each Lambda function separately, you can pass in the [`RouteProps`](#routeprops).

```js
const api = new Api(this, "Api", {
  routes: {
    "GET /notes": {
      authorizationType: "AWS_IAM",
      lambdaProps: {
        srcPath: "src/",
        handler: "list.main",
        environment: { tableName: table.tableName },
        initialPolicy: [
          new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: [
              "dynamodb:Scan",
              "dynamodb:Query",
              "dynamodb:GetItem",
              "dynamodb:PutItem",
              "dynamodb:UpdateItem",
              "dynamodb:DeleteItem",
              "dynamodb:DescribeTable",
            ],
            resources: [table.tableArn],
          }),
        ],
      },
    },
  },
});
```

Note that, you can set the `defaultLambdaProps` while using the `lambdaProps` per route. The `lambdaProps` will just override the `defaultLambdaProps`.

```js
const api = new Api(this, "Api", {
  defaultLambdaProps: {
    srcPath: "src/",
  },
  routes: {
    "GET /notes": {
      lambdaProps: {
        srcPath: "services/functions/",
        handler: "list.main",
      },
    },
    "POST /notes": "create.main",
  },
});
```
