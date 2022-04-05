### Configuring routes

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

### Custom domains

```js {2}
new GraphQLApi(this, "Api", {
  customDomain: "api.domain.com",
  server: "src/graphql.handler",
});
```

### Authorization

You can secure your APIs (and other AWS resources) by setting the `default.authorizer`.

```js {2}
new GraphQLApi(this, "Api", {
  defaults: {
    authorizer: "iam",
  },
  server: "src/graphql.handler",
});
```

### Access log

Use a CSV format instead of default JSON format.

```js {2-3}
new GraphQLApi(this, "Api", {
  accessLog:
    "$context.identity.sourceIp,$context.requestTime,$context.httpMethod,$context.routeKey,$context.protocol,$context.status,$context.responseLength,$context.requestId",
  server: "src/graphql.handler",
});
```

### CORS

Override the default behavior of allowing all methods, and only allow the GET method.

```js {2-4}
new GraphQLApi(this, "Api", {
  cors: {
    allowMethods: ["GET"],
  },
  server: "src/graphql.handler",
});
```

### More examples

For more examples, refer to the [`Api`](Api#examples) examples.
