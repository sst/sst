---
title: Auth
description: "Learn to handle authentication and manage sessions in your SST apps."
---

import HeadlineText from "@site/src/components/HeadlineText";

<HeadlineText>

SST ships with `Auth` — a modern lightweight authentication library for your apps.

</HeadlineText>

With a simple set of configuration, it'll create a function that'll handle various authentication flows. You can then attach this function to your API and SST will help you manage the session tokens.

:::tip
Want to learn more about `Auth`? Check out the [launch livestream on YouTube](https://youtu.be/cO9Chk6sUW4).
:::

---

## Overview

`Auth` is made up of the following pieces:

1. [`Auth`](constructs/Auth.md) — a construct that creates the necessary infrastructure.

   - The API routes to handle the authentication flows.
   - Securely generates a RSA public/private key pair to sign sessions.
   - Stores the RSA key pair as secrets in the app's [`Config`](config.md).

2. [`AuthHandler`](clients/auth.md#authhandler) — a Lambda handler function that can handle authentication flows for various providers.

   - High level [adapters](#adapters) for common providers like Google, GitHub, Twitch, etc.
   - OIDC and OAuth adapters that work with any compatible service.
   - A [`LinkAdapter`](#magic-links) to generate login links that can be sent over email or SMS.
   - Can be extended with [custom adapters](#custom-adapters) to support more complex workflows, like multi-tenant SSO.

3. [`Session`](#session) — a library for issuing and validating authentication sessions in your Lambda function code.

   - Implemented with stateless JWT tokens that are signed with the RSA key pairs mentioned above.
   - Support for passing tokens to the frontend via a cookie or the query string.
   - Full typesafety for issuing and validating sessions with the [`useSession`](clients/auth.md#usesession) hook.

---

## Quick start

Let's look at an example of how to add auth to your app. We'll be allowing your users to _Sign in with Google_.

You can use the Minimal TypeScript starter by running `npx create-sst@latest` > `minimal` > `minimal/typescript-starter`.

---

### Use the construct

`Auth` works by attaching additional routes to your API to handle authentication.

Import the [`Auth`](constructs/Auth.md) construct, attach it to your API and point it to a handler function.

```js title="stacks/api.ts"
import { Auth } from "sst/constructs";

const auth = new Auth(stack, "auth", {
  authenticator: {
    handler: "functions/auth.handler",
  },
});

auth.attach(stack, {
  api: myApi,
  prefix: "/auth", // optional
});
```

By default all the auth routes are added under `/auth`. But this can be customized.

<details>
<summary>Behind the scenes</summary>

Aside from the routes, this construct also creates a pair of secrets; a public and private key pair to sign the session tokens.

Note that, you can use the same auth construct with multiple APIs.

</details>

Now let's implement the handler.

---

### Add a handler

Start by creating a new function in `services/functions/auth.ts` that'll handle authentication requests.

```ts title="services/functions/auth.ts"
import { AuthHandler } from "sst/node/auth";

export const handler = AuthHandler({
  providers: {},
});
```

Let's configure the provider.

---

### Configure a provider

To allow our users to _Sign in with Google_, we'll add the [`GoogleAdapter`](#google) as a provider in our `AuthHandler`.

```js title="services/functions/auth.ts" {5-14}
import { AuthHandler, GoogleAdapter } from "sst/node/auth";

export const handler = AuthHandler({
  providers: {
    google: GoogleAdapter({
      mode: "oidc",
      clientID: "XXXX",
      onSuccess: async (tokenset) => {
        return {
          statusCode: 200,
          body: JSON.stringify(tokenset.claims()),
        };
      },
    }),
  },
});
```

This will handle the `/auth/google/authorize` and `/auth/google/callback` routes. Aside from Google, we have a few other built-in [adapters](#adapters).

<details>
<summary>Behind the scenes</summary>

[`AuthHandler`](clients/auth.md#authhandler) returns an authenticator function that'll do authentication handshakes and issue sessions for different providers.

We are using the `GoogleAdapter` in OIDC mode. This allows your handler function to handle a couple of routes:

1. `/auth/google/authorize` initializes the auth flow and redirects the user to Google.
2. `/auth/google/callback` handles the callback request after the user has been authenticated by Google. Make sure to add this URL to Google's OAuth configuration.

These routes are specific to the provider that you've configured. Head over to the `/auth` page for your API to check out all the auth routes that are available in your API.

</details>

At this point, you can add a _"Sign in with Google"_ button in your frontend!

You can redirect your users to `/auth/google/authorize` and kick off the authentication flow. If everything is configured right, your browser will print out the set of claims after it redirects to the callback from Google.

---

### Define a session type

Now we need to handle user sessions to ensure that the authenticated user remains logged in. To make creating and retrieving sessions typesafe, we'll start by defining our session types.

<details>
<summary>Multiple session types</summary>

You might only have a single type of session to start with. And it might contain a `userID` in its properties. If you have a multi-tenant app, you might want to add something like the `tenantID` as well.

We allow you to define multiple session types because in the future you may support other types of sessions. Like an _API key_ session that represents any server to server requests.

</details>

You can add your session types to the `SessionTypes` interface, like so.

```ts title="services/functions/auth.ts"
declare module "sst/node/auth" {
  export interface SessionTypes {
    user: {
      userID: string;
      // For a multi-tenant setup
      // tenantID: string
    };
  }
}
```

Here we are creating a new type of session called `user`.

---

### Create a session

Now in our `onSuccess` callback we can use the session `type: "users"` to create a session for the authenticated user.

```js title="services/functions/auth.ts"
onSuccess: async (tokenset) => {
  const claims = tokenset.claims()
  const user = /** TODO: create or look up a user from your db **/

  // Redirects to https://example.com?token=xxx
  return Session.parameter({
    redirect: "https://example.com",
    type: "user",
    properties: {
      userID: user.userID
    },
  })
}
```

The [`Session.parameter`](#query-parameters) call encrypts the given session object to generate a token.

:::info
`Auth` generates a public private key pair to encrypt the session token.
:::

It'll then redirect to the given `redirect` URL with `?token=xxxx` as the query string parameter.

<details>
<summary>Behind the scenes</summary>

Let's look at what we are doing above in detail.

- We are leaving it to you to implement the user lookup. SST very intentionally avoids providing abstractions for user management. These tend to be very specific to what you're building. We talk about this further in the [architecture](#architecture) section.
- The [`Session.parameter`](#query-parameters) call does a few things:
  - It takes a `type`. This is the type we added to `SessionTypes` above.
  - The `properties` takes what we've defined in the `SessionTypes` and is typesafe.
  - The `user.userId` is expected to come from our internal user lookup implementation.
  - Using this, the `Session` library creates an encrypted session token. It uses the key pairs that the `Auth` construct generated when it was first created.
  - The `redirect` URL is the frontend URL we'll be redirecting to.
- Once the session token is generated, the request redirects to the `redirect` URL with `?token=xxx` attached to the query string.

</details>

Here the `user.userID` should come from your database. You'll be using the `claims` that Google gives you to either create a new user or look up an existing user.

---

### Make requests

Once the auth flow redirects back to the frontend with the `token`, we just need to store it in local storage. You can also use cookies instead, [read about it below](#cookies).

Now in our frontend app we can check if the `token` is stored and use this to display if the user has signed in. And for subsequent API requests, we'll pass in the `token` in the request header in the standard format:

```
authorization: Bearer <token>
```

Finally, to log the user out, we can just clear out the `token` from local storage.

---

### Use the session

Now the frontend can use the stored `token` to make calls to API routes that need authentication.

In your API you'll need to check if the token is passed in and is valid. But it can be a hassle to have to pass the token all around in your application code.

To make it easy to check and validate the session across your app, SST has the [`useSession`](clients/auth.md#usesession) hook.

```js title="services/functions/rest/foo.ts"
import { ApiHandler } from "sst/node/api";
import { useSession } from "sst/node/auth";

export const needsAuthHandler = ApiHandler(async (event) => {
  const session = useSession();

  return {
    statusCode: 200,
    body: session.properties.userID,
  };
});
```

The `useSession` hook decrypts the session token with your public key and returns a typesafe object. This is the same one that we defined while [creating the session token](#create-a-session).

:::tip
The `useSession` hook can be called in any part of your API.
:::

Note that, to use the `useSession` hook you'll need to wrap your Lambda handler with the SST `ApiHandler` function.

<details>
<summary>Behind the scenes</summary>

The `useSession` hook relies on SST's internal context system to discover the authentication token. It allows us to access the session outside of our handler code.

Behind the scenes it works by setting a context object global variable that your application code can access.

The `useSession` hook then decrypts the token using the public key that the `Auth` construct had previously generated.

To call the `useSession` hook, you'll need to wrap your Lambda handler function with one of SST's handlers. So for an API request, use the [`ApiHandler`](clients/api.md#apihandler) function with `api` as the first argument.

This will initialize the context and allow you to call the `useSession` hook any where in your application code.

For example, if we look at the `needsAuthHandler` from our example above:

```js title="services/functions/rest/foo.ts"
export const needsAuthHandler = Handler("api", async (event) => {
  const session = useSession();

  return {
    statusCode: 200,
    body: session.properties.userID,
  };
});
```

This `Handler` also makes your function handler typesafe. Meaning the `event` and the response object will be properly typed, without passing in any additional types.

Note that the `session` object here is the same as the one we defined previously and the type is based on the one we added to `SessionTypes`.

```ts
{
  type: "user",
  properties: {
    userID: user.userID
  }
}
```

If you are using the [`GraphQLHandler`](clients/graphql.md#graphqlhandler) that comes with the GraphQL starter in the [`create sst`](packages/create-sst.md) CLI, it'll transparently initialize the context system.

Here's an example of a GraphQL query that gets the current user from the session.

```js title="services/functions/graphql/types/foo.ts" {7}
import { useSession } from "sst/node/auth";

builder.mutationFields((t) => ({
  createTask: t.field({
    type: TaskType,
    resolve: () => {
      const session = useSession();
      if (session.type !== "user") throw new Error("Must be logged in");
      return Task.create(session.properties.userID);
    },
  }),
}));
```

</details>

And that's it! You get a fully functioning auth setup. It's secure, customizable, doesn't rely on any third party services, and all your user data is stored on your side.

---

## Architecture

Authentication is usually thought to be complex. But with modern standards, it can be easy to implement. Let's take a step back and look at the typical authentication flow:

1. Perform handshake with authentication strategy

   This could be OAuth with a third party provider (like a Google login from the example above). Or something as simple as a link that needs to be clicked.

2. Get the claims from the handshake

   The result of this handshake is a set of validated _claims_ about who the user is. The claims could include things like the user's email.

   You can then use these claims to create and store the user's info in your database. Or first check if the user exists by looking them up in your database.

3. Generate a session token

   A session token is generated on the backend. The frontend then uses this token for subsequent requests. The session token tells us which user is making the request.

The key here is that SST's `Auth` has out of the box support for steps 1 and 3. It **intentionally** does not manage the user storage part of step 2.

User storage contains details that tend to be very specific to your application. It's also best if these details live alongside the rest of your business logic. And the user data is stored in _your_ database.

The separation of responsibilities into things that are undifferentiated (1 & 3), and things that are not (2), is what makes SST's `Auth` both powerful and flexible for even the most complex authentication scenarios.

---

## Cost

`Auth` is not a managed service. It is completely stateless, and free to use.

---

## Adapters

We covered the Google sign in above, but `Auth` also ships with Adapters for various authentication providers. Including any provider that supports OAuth or OIDC, as well as internal flows like magic link.

---

### OAuth

A general adapter for any OAuth2 compatible service.

```js
import { Issuer } from "openid-client";

OauthAdapter({
  issuer: new Issuer({
    issuer: "<issuer-namespace>",
    authorization_endpoint: "<authorization-endpoint>",
    token_endpoint: "<token-endpoint>",
  }),
  clientID: "<client-id>",
  clientSecret: "<client-secret>",
  scope: "<space separated list of scopes>",
  prompt: "<prompt>", // optional
  onSuccess: (tokenset) => {},
});
```

---

### OIDC

A general adapter for any OIDC compatible service.

```js
import { Issuer } from "openid-client";

OidcAdapter({
  issuer: await Issuer.discover("<oidc root url>");
  clientID: "<client-id>",
  scope: "<space separated list of scopes>",
  onSuccess: (tokenset) => {}
})
```

---

### Google

The Google adapter supports both [OIDC](https://openid.net/connect/) and [OAuth](https://oauth.net).

#### OIDC

Use OIDC when you only need to authenticate who the user is and retrieve their email and name.

```js
GoogleAdapter({
  mode: "oidc",
  clientID: "<client-id>",
  onSuccess: async (tokenset) => {},
});
```

#### OAuth

Use OAuth when you need the user to grant you access to additional scopes like reading their Google Calendar, etc.

```js
GoogleAdapter({
  mode: "oauth",
  clientID: "<client-id>"
  clientSecret: "<client-secret>",
  scope: "<space separated list of scopes>",
  prompt: "consent", // optional
  onSuccess: async (tokenset) => {},
})
```

---

### GitHub

Extends the `OauthAdapter` and pre-configures with GitHub OAuth URLs.

```js
GithubAdapter({
  clientID: "<client-id>"
  clientSecret: "<client-secret>",
  scope: "<space separated list of scopes>",
  onSuccess: async (tokenset) => {},
})
```

---

### Twitch

Extends the `OidcAdapter` and is preconfigured with Twitch OIDC urls.

```js
TwitchAdapter({
  clientID: "<client-id>"
  onSuccess: async (tokenset) => {},
}),
```

---

### Facebook

Extends the `OauthAdapter` and pre-configures with Facebook OAuth URLs.

```js
FacebookAdapter({
  clientID: "<client-id>"
  clientSecret: "<client-secret>",
  scope: "<space separated list of scopes>",
  onSuccess: async (tokenset) => {},
})
```

---

### Magic Links

Issues magic links that you can send over email or SMS to verify users without the need of a password.

```js
// Frontend
location.href =
  "https://api.example.com/auth/link/authorize?email=user@example.com";

// Provider configuration
LinkAdapter({
  onLink: async (link, claims) => {
    /* ------------ To Implement ------------ */
    /* This function receives a link that     */
    /* you can send over email or sms so      */
    /* that the user can login.               */
    /* -------------------------------------- */
  },
  onSuccess: async (claims) => {},
});
```

You will need to implement an `onLink` callback to send the link through your preferred mechanism; email or SMS. Any query parameters included in the redirect from your frontend will be passed through in the `claims` argument. This is useful to include the email or phone number you will be sending the link to.

---

### Custom Adapters

You can create your own adapters with the `createAdapter` function for handling flows that do not work out of the box.

A common example would be to conditionally use different providers based on multi-tenant configuration. Here's an example:

```js
import { createAdapter } from "sst/node/auth";

const google = GoogleAdapter({...});
const link = LinkAdapter({...});

export const MultiTenantAdapter = createAdapter(
  () => {
    const tenantID = useQueryParam("tenantID");
    const tenantInfo = Tenant.fromID(tenantID);

    if (tenantInfo.googleAuth) {
      return google();
    }

    return link();
  }
);
```

---

## Session

The `Session` library can be used to generate a token by encrypting a session object, and redirecting to the frontend with it.

---

### Query parameters

As covered in the example in the [Quick start](#quick-start), `Session.parameter` uses the query string parameter to return the session token.

```js title="services/functions/auth.ts" {7-13}
export const handler = AuthHandler({
  // TODO: Define provider
  // ...
  onSuccess: async () => {
    // TODO: Grab claims
    // ...
    return Session.parameter({
      redirect: "https://example.com",
      type: "user",
      properties: {
        userID: user.userID,
      },
    });
  },
});
```

Here the handler will redirect to the given URL with a `token=xxx` query parameter added.

---

### Cookies

Similarly, you can use cookies to pass the token back to the frontend.

```js title="services/functions/auth.ts" {7-13}
export const handler = AuthHandler({
  // TODO: Define provider
  // ...
  onSuccess: async () => {
    // TODO: Grab claims
    // ...
    return Session.cookie({
      redirect: "https://example.com",
      type: "user",
      properties: {
        userID: user.userID,
      },
    });
  },
});
```

---

#### Cookies vs Query parameters

The cookie strategy for managing sessions requires some additional configuration on your API but is less work on your frontend. The API will issue a cookie that can be automatically included with all future requests so your frontend does not have to think about local storage.

You must allow cookies to be sent cross-origin from your frontend, which is usually running on `localhost` during development and another subdomain in production.

So update your [`Api`](constructs/Api.md) with the correct `cors` options.

```js title="stacks/api.ts"
new Api(stack, "api", {
  cors: {
    allowCredentials: true,
    allowHeaders: ["content-type"],
    allowMethods: ["ANY"],
    allowOrigins: ["http://localhost:3000", "https://INSERT_PROD_URL"],
  },
});
```

---

#### Frontend

In your frontend, when making requests to your API, make sure you specify `credentials: "include"` with the request so that the cookie is included.

Here are a couple of examples for how to do this:

1. [Fetch](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API)

   ```js
   fetch("/path", {
     credentials: "include",
   });
   ```

2. [Urql](https://formidable.com/open-source/urql/)

   ```js
   const urql = createClient({
     fetchOptions: () => {
       return {
         credentials: "include",
       };
     },
   });
   ```

---

### Create a token

You can also directly generate the session token without doing a redirect. This is most useful while writing tests to create dummy users to make requests to your API.

```js
const jwt = Session.create({
  type: "user",
  properties: {
    userID: user.userID,
  },
});
```

---

## FAQ

Here are some frequently asked questions about `Auth`.

---

### Is Auth storing any sensitive data?

`Auth` is 100% stateless and all of its mechanisms are implemented through short lived JWT tokens. While there are some tradeoffs with this approach, it greatly reduces the complexity of the API, and simplifies the implementation. And doesn't need any third party services.

---

### What about password based auth?

As of now all of the `Auth` adapters can be implemented in a stateless way and do not require storing anything in a database.

Introducing password auth would require storing and retrieving password data. Additionally it requires more complicated integrations for register, login, reset password flows.

We strongly recommend passwordless flow to keep things simple for yourself and your users. That said if you are interested in passwords, talk to us in Discord.

---

### Why not use Cognito?

Managed auth services, like [Cognito](https://aws.amazon.com/cognito/) or [Auth0](https://auth0.com), tend to bundle all the auth related concepts together; performing handshakes with a provider, using the claims to get a user from a user directory, and generating session tokens.

Unfortunately this leads to challenging situations. For example, let's suppose you wanted to build a role based access system for your app. You'll need to figure out if your auth provider has this feature and if their implementation works for you. If it doesn't you'll likely build this in your application. However, now your user's data is stored on their side, while the information regarding the roles are stored on your side.

As a result, your auth provider's dashboard won't be as helpful because it'll be missing a lot of relevant info about your users. And building internal tooling on your side is now more complicated because it needs to grab the data from two separate sources and join them.

As your application grows, you'll find that more and more of the user storage related logic keeps shifting to your side. While the auth provider's user storage system is reduced to a simple key value store.

Typically, you don't need to worry about challenges like this early in your company's lifecycle. However, auth providers can be notoriously hard to migrate away from. To carry out a migration, you'll need all your users to explicitly create a new account on your new auth system. You cannot do this process behind the scenes.

So if your auth provider makes pricing or design changes that are deal-breakers, or if their design is too restrictive; you'll need to go through a very painful migration process.

All this is especially true for startups that are rapidly building out their user storage systems and need the flexibility. For these reasons, we recommend that startups handle the user storage within their apps and avoid relying on managed auth providers.

SST's `Auth` is designed to make it easier to roll out your own auth system while giving you the flexibility to extend it while you grow.
