The `GraphQLApi` construct is a higher level CDK construct that makes it easy to create GraphQL servers with AWS Lambda. It provides a simple way to define the GraphQL handler route in your API. And allows you to configure the specific Lambda function if necessary. It also allows you to configure authorization, custom domains, etc.

The `GraphQLApi` construct internally extends the [`Api`](Api) construct.

:::warning
The `GraphQLApi` construct is deprecated, and will be removed in SST v2. Use the [`Api`](Api.md) construct with a `graphql` route instead. [Read more about how to upgrade.](../../upgrade-guide.md#upgrade-to-v118)
:::

## Examples

### Using the minimal config

```js
import { GraphQLApi } from "@serverless-stack/resources";

new GraphQLApi(stack, "Api", {
  server: "src/graphql.handler",
});
```

### Configuring routes

You can configure the Lambda function used for the GraphQL Server.

```js
new GraphQLApi(stack, "Api", {
  server: {
    handler: "src/graphql.handler",
    timeout: 10,
    memorySize: 512,
  },
});
```

### Custom domains

```js {2}
new GraphQLApi(stack, "Api", {
  customDomain: "api.domain.com",
  server: "src/graphql.handler",
});
```

### Authorization

You can secure your APIs (and other AWS resources) by setting the `default.authorizer`.

```js {2}
new GraphQLApi(stack, "Api", {
  defaults: {
    authorizer: "iam",
  },
  server: "src/graphql.handler",
});
```

### Access log

Use a CSV format instead of default JSON format.

```js {2-3}
new GraphQLApi(stack, "Api", {
  accessLog:
    "$context.identity.sourceIp,$context.requestTime,$context.httpMethod,$context.routeKey,$context.protocol,$context.status,$context.responseLength,$context.requestId",
  server: "src/graphql.handler",
});
```

### CORS

Override the default behavior of allowing all methods, and only allow the GET method.

```js {2-4}
new GraphQLApi(stack, "Api", {
  cors: {
    allowMethods: ["GET"],
  },
  server: "src/graphql.handler",
});
```

### More examples

For more examples, refer to the [`Api`](Api#examples) examples.
