---
description: "Overview of the `auth` module."
---

Overview of the `auth` module in the `sst/node` package.

```ts
import { ... } from "sst/node/auth"
```

The `auth` module has the following exports.

---

## Types

Types to help you define the shape of your function arguments.

---

### SessionTypes

A type interface you can extend to define the auth session types.

```ts
declare module "sst/node/auth" {
  export interface SessionTypes {
    user: {
      userID: string;
    };
  }
}
```

---

## Methods

Methods that you can call in this module.

---

### Session

The [`Session`](../auth.md#session) module can then be used to create an encrypted session token that'll be passed to the client.

```ts
import { Session } from "sst/node/auth";
```

#### cookie

Creates a JWT session token with the provided session information, and returns a 302 redirect with an auth-token cookie set with the jwt value.

```ts
Session.cookie({
  type: "user",
  properties: {
    userID: "123",
  },
  redirect: "https://app.example.com/",
});
```

#### parameter

Creates a JWT session token with the provided session information, and returns a 302 redirect with a query parameter named token set with the jwt value. In subsequent requests the client will pass in this token, `authorization: Bearer <token>`.

```ts
Session.parameter({
  type: "user",
  properties: {
    userID: "123",
  },
  redirect: "https://app.example.com/",
});
```

---

## Handlers

The handlers can wrap around your Lambda function handler.

---

### AuthHandler

The `AuthHandler` provides a function that can be used to implement various authentication strategies. You can [read more about it over on the auth docs](../auth.md).

```ts
import { AuthHandler } from "sst/node/auth";

export const handler = AuthHandler({
  providers: {
    link: LinkAdapter(...)
  }
});
```

#### Options

- `providers` — An object listing the providers that have been configured.

---

## Hooks

The hooks are functions that have access to the current invocation.

---

### useSession

This hook returns the current session object.

```ts
import { useSession } from "sst/node/auth";

const session = useSession();

if (session.type === "user") {
  console.log(session.properties.userID);
}
```

The `useSession` hook will then decrypt and parse this token and return with the previously defined [session type](#sessiontypes).
