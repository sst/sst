---
description: "Snippets for the sst.GraphQL construct"
---

## Using the minimal config

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

const server = new GraphQLApi({
  typeDefs,
  resolvers,
  playground: true, // Enable GraphQL playground
});

exports.handler = server.createHandler();
```

## Configuring the Lambda function

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

## Configuring the API

You can also configure the API with a custom domain, access log format, CORS settings, and authorization settings. For more detailed examples refer to the [`Api`](Api#examples) examples.

### Configuring custom domains

```js {2}
new GraphQLApi(this, "Api", {
  customDomain: "api.domain.com",
  server: "src/graphql.handler",
});
```

### Configuring the access log format

Use a CSV format instead of default JSON format.

```js {2-3}
new GraphQLApi(this, "Api", {
  accessLog:
    "$context.identity.sourceIp,$context.requestTime,$context.httpMethod,$context.routeKey,$context.protocol,$context.status,$context.responseLength,$context.requestId",
  server: "src/graphql.handler",
});
```

### Configuring CORS

Override the default behavior of allowing all methods, and only allow the GET method.

```js {2-4}
new GraphQLApi(this, "Api", {
  cors: {
    allowMethods: ["GET"],
  },
  server: "src/graphql.handler",
});
```

### Adding auth

You can secure your APIs (and other AWS resources) by setting the `defaultAuthorizationType` to `AWS_IAM` and using the [`Auth`](Auth.md) construct.

```js {2}
new GraphQLApi(this, "Api", {
  defaults: {
    authorizer: "iam",
  },
  server: "src/graphql.handler",
});
```

For more examples, refer to the [`Api`](Api.md#examples) examples.
