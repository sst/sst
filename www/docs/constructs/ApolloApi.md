---
description: "Docs for the sst.ApolloApi construct in the @serverless-stack/resources package"
---

The `ApolloApi` construct is a higher level CDK construct that makes it easy to create an Apollo Server with AWS Lambda. It provides a simple way to define the GraphQL handler route in your API. And allows you to configure the specific Lambda functions if necessary. It also allows you to configure authorization and custom domains. See the [examples](#examples) for more details.

## Initializer

```ts
new ApolloApi(scope: Construct, id: string, props: ApolloApiProps)
```

_Parameters_

- scope [`Construct`](https://docs.aws.amazon.com/cdk/api/latest/docs/constructs.Construct.html)
- id `string`
- props [`ApolloApiProps`](#apolloapiprops)

## Examples

The `Api` construct is designed to make it easy to get started it with, while allowing for a way to fully configure it as well. Let's look at how, through a couple of examples.

### Using the minimal config

```js
new ApolloApi(this, "Api", {
  server: "src/graphql.handler",
});
```

And here is an example of the `src/graphql.js` handler file taken from the [Apollo Docs](https://www.apollographql.com/docs/apollo-server/deployment/lambda/#setting-up-your-project):

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

export const handler = server.createHandler();
```

### Configuring the API

You can also configure the API with a custom domain, access log format, CORS settings, and authorization settings. Refer to the examples from the the [`Api`](Api#examples).

## Properties

Refer to the properties made available by [`Api`](Api#properties).

## Methods

Refer to the methods made available by [`Api`](Api#methods).

Note the `addRoutes` method is not available for `ApolloApi`.

## ApolloApiProps

Takes the following construct props in addition to the [`ApiProps`](Api.md#apiprops).

Note the `routes` option cannot be set for `ApolloApi`.

### server?

_Type_ : [`FunctionDefinition`](Function.md#functiondefinition)

The function definition used to create the function for GraphQL handler.
