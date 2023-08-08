---
description: "Docs for the sst.GraphQL construct in the @serverless-stack/resources package"
---

:::caution
This is the SST v0.x Constructs doc. SST v1 is now released. If you are using v1, see the [v1 Constructs doc](/constructs). If you are looking to upgrade to v1, [check out the migration steps](/constructs/v0/migration).
:::

The `GraphQLApi` construct is a higher level CDK construct that makes it easy to create GraphQL servers with AWS Lambda. It provides a simple way to define the GraphQL handler route in your API. And allows you to configure the specific Lambda function if necessary. It also allows you to configure authorization, custom domains, etc.

The `GraphQLApi` construct internally extends the [`Api`](Api.md) construct.

:::info
In [v0.65.1](https://github.com/sst/sst/releases/tag/v0.65.1), there was a breaking change to rename the `ApolloApi` construct to `GraphQLApi`.
:::

## Initializer

```ts
new GraphQLApi(scope: Construct, id: string, props: GraphQLApiProps)
```

_Parameters_

- scope [`Construct`](https://docs.aws.amazon.com/cdk/api/v2/docs/constructs.Construct.html)
- id `string`
- props [`GraphQLApiProps`](#graphqlapiprops)

## Examples

### Using the minimal config

```js
import { GraphQLApi } from "@serverless-stack/resources";

new GraphQLApi(this, "Api", {
  server: "src/graphql.handler",
});
```

And here is an example of a simple handler defined in `src/graphql.js`.

```js
import { ApolloServer, gql } from "apollo-server-lambda";

// Construct a schema, using GraphQL schema language
const typeDefs = gql`
  type Query {
    hello: String
  }
`;

// Provide resolver functions for your schema fields
const resolvers = {
  Query: {
    hello: () => "Hello world!",
  },
};

const server = new ApolloServer({
  typeDefs,
  resolvers,
  playground: true, // Enable GraphQL playground
});

exports.handler = server.createHandler();
```

### Configuring the Lambda function

You can configure the Lambda function used for the GraphQL Server.

```js
new GraphQLApi(this, "Api", {
  server: {
    handler: "src/graphql.handler",
    timeout: 10,
    memorySize: 512,
  },
});
```

### Configuring the API

You can also configure the API with a custom domain, access log format, CORS settings, and authorization settings. For more detailed examples refer to the [`Api`](Api#examples) examples.

#### Configuring custom domains

```js {2}
new GraphQLApi(this, "Api", {
  customDomain: "api.domain.com",
  server: "src/graphql.handler",
});
```

#### Configuring the access log format

Use a CSV format instead of default JSON format.

```js {2-3}
new GraphQLApi(this, "Api", {
  accessLog:
    "$context.identity.sourceIp,$context.requestTime,$context.httpMethod,$context.routeKey,$context.protocol,$context.status,$context.responseLength,$context.requestId",
  server: "src/graphql.handler",
});
```

#### Configuring CORS

Override the default behavior of allowing all methods, and only allow the GET method.

```js {4-6}
import { HttpMethod } from "@aws-cdk/aws-apigatewayv2-alpha";

new GraphQLApi(this, "Api", {
  cors: {
    allowMethods: [HttpMethod.GET],
  },
  server: "src/graphql.handler",
});
```

#### Adding auth

You can secure your APIs (and other AWS resources) by setting the `defaultAuthorizationType` to `AWS_IAM` and using the [`Auth`](Auth.md) construct.

```js {2}
new GraphQLApi(this, "Api", {
  defaultAuthorizationType: ApiAuthorizationType.AWS_IAM,
  server: "src/graphql.handler",
});
```

For more examples, refer to the [`Api`](Api.md#examples) examples.

## Properties

An instance of `GraphQLApi` contains the following properties in addition to the properties in the [`Api`](Api#properties) construct.

### serverFunction

_Type_: [`Function`](Function.md)

The instance of the internally created `Function` for the GraphQL server.

## Methods

Refer to the methods in the [`Api`](Api#methods) construct.

## GraphQLApiProps

Takes the following construct props in addition to the [`ApiProps`](Api.md#apiprops).

:::note
The `routes` option cannot be set in `GraphQLApi`.
:::

### server

_Type_ : [`FunctionDefinition`](Function.md#functiondefinition)

The function definition used to create the function for GraphQL handler.

### rootPath

_Type_ : `string`, _defaults to_ `/`

The URL path for the GraphQL endpoint.

By default, the endpoint will be accessible at `/`. By setting the `rootPath` to `/custom`, the endpoint will be accessible at `/custom`.
