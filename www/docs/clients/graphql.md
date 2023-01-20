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

A Lambda optimized GraphQL server that minimizes cold starts. It has a similar API to other alternatives like Apollo server so should be simple to switch.

```js
import { GraphQLHandler } from "sst/node/graphql";

export const handler = GraphQLHandler({
  schema,
});
```

##### Options

- `formatPayload` - Callback to intercept the response and make any changes before sending response.
- `context` - Callback that runs at the beginning of the request to provide the context variable to GraphQL resolvers.
- `schema` - The GraphQL schema that should be executed.
