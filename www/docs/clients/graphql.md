---
description: "Overview of the `graphql` module."
---

Overview of the `graphql` module in the `sst/node` package.

```ts
import { ... } from "sst/node/graphql"
```

The `graphql` module has the following exports.

---

## Handlers

The handlers can wrap around your Lambda function handler.

---

### GraphQLHandler

A Lambda-optimized [GraphQL Yoga](https://the-guild.dev/graphql/yoga-server) server that minimizes cold starts.

```js
import { GraphQLHandler } from "sst/node/graphql";

export const handler = GraphQLHandler({
  schema,
});
```

#### Options

The options passed to `GraphQLHandler` are used to create a GraphQL Yoga server instance. This means you can leverage the [Envelop](https://the-guild.dev/graphql/envelop) plugin system and [GraphQL Tools](https://the-guild.dev/graphql/tools) to build your GraphQL API.
