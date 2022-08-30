---
title: Auth
description: "Learn to handle authentication and manage sessions in your SST apps."
---

SST ships with `Auth` — a lightweight authentication solution for your apps. With a simple set of configuration, it'll create a function that'll handle various authentication flows. You can then attach this function to your API and SST will deploy it for you.

## Overview

`Auth` is made up of the following pieces:

1. [`Auth`](constructs/Auth.md) — a construct that can be attached to your API.

   - It provides the necessary authentication routes.
   - Handles secure generation of RSA keypair to sign sessions.
   - Stores the RSA keypair as secrets to the app [`Config`](environment-variables.md).

2. `AuthHandler` — a Lambda handler function that can be used to handle authentication flows across various providers.

   - High level adapters for common providers, like Google, GitHub, Twitch, etc.
   - OIDC and OAuth adapters that work with any compatible service.
   - A `LinkAdapter` to generate login links that can be sent over email or SMS.
   - Can be extended with custom adapters to support more complex workflows, like multi-tenant SSO.

3. `Session` — a library for issuing and validating authentication sessions in your Lambda function code.

   - Implemented with stateless JWT tokens that are signed with the RSA keypairs (mentioned above).
   - Support for passing tokens to the frontend via query parameter or cookie.
   - Full typesafety for issuing and validating sessions.

## Architecture

Authentication in general is thought to be complex. But with modern standards, it can be easy to implement. Let's look at the typical authentication flow:

1. Perform handshake with authentication strategy.

   This could be OAuth with a third party provider (like a social login). Or something as simple as an email link that needs to be clicked.

2. Get the claims from the handshake.

   The result of this handshake is a set of validated claims about who the user is. The claims could include things like the user's email. You can then use these claims to create and store the user info in your database. Or check if the user exists by looking them up in a database.

3. Generate a session token.

   A session token is generated on the backend. The frontend then uses this token for subsequent requests. The session token tells us which user is making the request.

The key here is that SST's `Auth` has out of the box support for steps 1 and 3. It **intentionally** does not manage the user storage part of step 2.

User storage contains details that tend to be very specific to your application. It's also best if these details live alongside the rest of your business logic. And the data is stored on in your database.

The seperation of responsibilities into things that are undifferentiated (1 & 3), and things that are not (2) is what makes SST's `Auth` both powerful and flexible enough for the most complex authentication scenarios.

### Why not use Cognito

Managed auth services, like Cognito or Auth0, tend to bundle all these concepts together. Unfortunately this usually leads to challenging situations.

For example, let's suppose you wanted to build a role based access system for your app. You'll need to figure out if your auth provider has this feature and if their implementation works for you. If it doesn't you'll likely build this in your application. However, now your user's data is stored on their side, while your the information regarding the roles are on your side.

This separation means that the dashboard that your auth provider has won't be useful because it'll be missing a lot of relevant info about your users. And building internal tooling on your side is now more complicated because it needs to grab the data from two separate sources and join them.

As your applicaiton grows, you'll find that more of the user storage related logic is on your side. While the auth provider isn't doing a whole lot more than just being a key value store for your user data.

All this is espcially true for startups that are making rapid building out their user storage systems and need the flexbility.

Typically, you don't need to worry about challenges like this early in your company's lifecycle. However, auth providers can be notoriously hard to migrate away from. You need all your users to explicitly create a new account on your new auth system. You cannot do this migraton behind the scenes.

So if you auth provider makes pricing or design changes that are deal-breakers for you, or if their design is too restrictive, you'll need to go through a very painful migration process. This means that it's important that you make the choice of an auth solution early.

For these reasons, we recommend startups to handle the user storage within their apps and avoid relying on managed auth providers.

SST's `Auth` is designed to make it easier to roll out your own auth system while giving you the flexility extend it while you grow.

## Setup

Let's look at an example of how to add auth to your app be allowing your users to _Sign in with Google_.

### Add a handler

Start by creating a new function in your functions folder that'll handle authentication requests. Typically, you'll place this in `services/functions/auth.ts`.

`AuthHandler` returns an authenticator function that'll do authentication handshakes and issue sessions for different providers.

We'll leave the provider configuration empty to start.

```ts title="services/functions/auth.ts"
import { AuthHandler } from "@serverless-stack/node/auth";

export const handler = AuthHandler({
  providers: {},
});
```

### Setup the construct

`Auth` works by adding additional routes to your API to handle authentication. Import the [`Auth`](constructs/Auth.md) construct, attach it to your API and point it to the handler function above.

:::tip
You can use the same auth construct with multiple APIs.
:::

```js title="stacks/api.ts"
import { Auth } from "@serverless-stack/resources";

const auth = new Auth(stack, "auth", {
  authenticator: "functions/auth.handler",
});

auth.attach(stack, {
  api: myApi,
  prefix: "/auth", // optional
});
```

Behind the scenes, this construct also creates a pair of secrets; a public and private keypair to sign the session tokens. It stores this in our app `Config`.

### Configure a provider

The `AuthHandler` can be configured with the set of providers that you'd like to support.

Here's an example of configuring a provider named `google` that uses a `GoogleAdapter` in OIDC mode.

```js {6-15} title="services/functions/auth.ts"
import { AuthHandler, GoogleAdapter } from "@serverless-stack/node/auth";
import { Config } from "@serverless-stack/node/config";

export const handler = AuthHandler({
  providers: {
    google: new GoogleAdapter({
      mode: "oidc",
      clientID: Config.GOOGLE_CLIENT_ID,
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

This allows your handler function to handle a couple of routes:

1. `/auth/google/authorize` initializes the auth flow and redirects the user to Google.
2. `/auth/google/callback` handles the callback request after the user has been authenticated by Google. Make sure to add this URL to Google's OAuth configuration.

These routes are specific to the provider that you have configured. The auth index page, `/auth` shows you exactly the routes that are available.

:::tip
Head over to the `/auth` page to check out all the auth routes that are available in your API.
:::

Note that this example uses [`Config`](environment-variables.md). It allows you to easily manage the secrets in your app. You'll need to ensure that the secret is made available to your function.

```js {5-10} title="stacks/api.ts"
import { Auth, Config } from "@serverless-stack/resources"

new Auth(stack, "auth", {
  api: myApi,
  function: {
    handler: "functions/auth.handler",
    config: {
      new Config.Secret(stack, "GOOGLE_CLIENT_ID")
    }
  }
})
```

You'll also need to use the CLI to set this secret.

```bash
npx sst secrets set GOOGLE_CLIENT_ID xxxxxxxxxx
```

And make sure to [follow the `Config` docs](environment-variables.md) to learn how to set these values across various stages.

At this point, you can add a _"Sign in with Google"_ button in your frontend. It'll redirect to `/auth/google/authorize` and kick off the authentication flow. If everything is configured right, your browser will print out the set of claims after it redirects to the callback from Google.

### Create a session

Once the user has been authenticated, you'll need to handle looking up the user, or creating one. You can do this using the `onSuccess` callback in the `AuthHandler`.

As noted in the [Architecture](#architecture) section above, SST very intentionally avoids providing abstractions for user management. Since these tend to be very specific to what you're building. It just makes more sense that these are handled by you.

However, we do provide a way to create a session once you have retreived the user.

In TypeScript you can define the various session types. So that creating a session and retreiving it in requests is completely typesafe.

You can add your session types to `SessionTypes` interface.

```js title="services/functions/auth.ts"
declare module "@serverless-stack/node/auth" {
  export interface SessionTypes {
    user: {
      userID: string
      // For a multi-tenant setup
      // tenantID: string
    }
  }
}
```

You might only have a `user` session type to start with. And it might contain a `userID` in its properties. If you have a multi-tenant app, you might want to add the something like the `tenantID` as well.

In the future you may support other types of sessions, like an `apikey` session that represents any server to server requests..

Once the session type is defined, you can update your `onSuccess` callback to do user lookup (and creation) from the claims. Once you know the user's id, you can generate create a new session object with the above type, set the `userId`, and redirect back to your frontend with the session token, either in the query parameter or as a cookie.

```js title="services/functions/auth.ts"
import { AuthHandler, Session } from "@serverless-stack/node/auth"
import { Config } from "@serverless-stack/node/config"

export const handler = AuthHandler({
  providers: {
    google: new GoogleAdapter({
      mode: "oidc",
      clientID: Config.GOOGLE_CLIENT_ID,
      onSuccess: async (tokenset) => {
        const claims = tokenset.claims()
        const user =
        /* ------------ To Implement ------------ */
        /* This is where you will lookup the user */
        /* in your database by the email in the   */
        /* claims and create them if they do not  */
        /* exist.                                 */
        /* -------------------------------------- */

        // Will redirect to https://example.com?token=xxx
        return Session.queryParameter({
          redirect: "https://example.com",
          type: "user",
          properties: {
            userID: user.userID
          },
        })
      }
    })
  },
})
```

Let's look at the `onSuccess` callback here:

- We've intentionally left the user look up and creation part empty. This'll be implemented based on how you are storing your users.
- The `Session.queryParameter` call does a few things:
  - It takes a `type`. This is the type we added to `SessionTypes` above.
  - The `properties` takes what we've defined in the `SessionTypes` and is typesafe.
  - The `user.userId` is expected to come from our internal user lookup implementation.
  - Using this, the `Session` object creates a session token encrypted using the keypairs that the `Auth` construct generates when it's first created..
  - The `redirect` URL is the frontend URL we'll be redirecting to.
- In this example we are using `queryParameter` strategy, meaning that this request redirects to the `redirect` URL with `?token=xxx` attached to the query string. `Session` also supports the [cookie strategy](#cookie).

### Frontend requests

Once the auth flow redirects back to the frontend with the `token`, we just need to store it. If we are using the `queryParameter` strategy we might want to save this in local storage. While for the `cookie` strategy it'll be automatically stored in the cookie.

Now in our frontend app we can check if the `token` is stored to display that the user has signed in.

And for any subsequent API requests, we'll pass in the `token` in the request header in this format:

```
authorization: Bearer <token>
```

And if we want to log the user out, we can just clear out the `token` from local storage or the cookie.

### Using the session

For the API requests that need authentication, we'll first want to check if the `token` is passed in. It can be a hassle to do this in your handler and to pass this around in your application code.

To make it easy to do this across your app, SST provides a `useSession` hook.

:::tip
The `useSession` hook can be called in any part of your API.
:::

Here's an example of a GraphQL query that gets the current user from the session.

```js title="services/functions/graphql/types/foo.ts"
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

Note that the `session` object here is the same as the one we defined while creating it and the type is based on the one we added to `SessionTypes`.

```ts
{
  type: "user",
  properties: {
    userID: user.userID
  }
}
```

The `useSession` hook relies on SST's internal context system to discover the authentication token. It allows us to access the session outside of our handler code. Behind the scenes it works by setting a context object that your application code can access.

If you are using the `GraphQLHandler` that comes with the GraphQL starter in the [`create sst`](packages/create-sst.md) CLI, it'll transparently initialize the context system.

For any other kind of request you just need to wrap your handler function with our generic `Handler`. It'll initialize the context so you can use the `useSession` hook there as well.

Here's an example of how you'd implement handle a typical API request.

```js title="services/functions/rest/foo.ts"
import { Handler } from "@serverless-stack/node/context";

export const getSessionTypeHandler = Handler("api", async (event) => {
  const session = useSession();

  return {
    statusCode: 200,
    body: session.type,
  };
});
```

Note here that by passing in `api` to the `Handler`, it makes this call typesafe. So the `event` and the response object will be properly typed, without passing in any additional type info.

And that's it! You can a fully functioning auth setup. It's secure, customizable, doesn't rely on any third party services, and all your user data is stored on your side.

## Adapters

We covered the Google sign in above, but `Auth` also ships with Adapters for various authentication providers. Including any provider that supports OAuth or OIDC, as well as internal flows like magic link.

### `OauthAdapter`

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
  scope: "<space seperated list of scopes>",
  prompt: "<prompt>", // optional
  onSuccess: (tokenset) => {},
});
```

### `OidcAdapter`

A general adapter for any OIDC compatible service.

```js
import { Issuer } from "openid-client";

OidcAdapter({
  issuer: await Issuer.discover("<oidc root url>");
  clientID: "<client-id>",
  scope: "<space seperated list of scopes>",
  onSuccess: (tokenset) => {}
})
```

### `GoogleAdapter`

The Google adapter supports both OIDC and OAuth. Use OIDC when you only need to authenticate who the user is and retreive their email and name. Use OAuth when you need the user to grant you access to additional scopes like reading their Google Calendar, etc.

#### OIDC

```js
GoogleAdapter({
  mode: "oidc",
  clientID: "<client-id>",
  onSuccess: async (tokenset) => {}
}),
```

#### OAuth

```js
GoogleAdapter({
  mode: "oauth",
  clientID: "<client-id>"
  clientSecret: "<client-secret>",
  scope: "<space seperated list of scopes>",
  prompt: "consent", // optional
  onSuccess: async (tokenset) => {},
}),
```

### `GithubAdapter`

This adapter simply extends the `OauthAdapter` and preconfigures with GitHub OAuth URLs.

```js
GithubAdapter({
  clientID: "<client-id>"
  clientSecret: "<client-secret>",
  scope: "<space seperated list of scopes>",
  onSuccess: async (tokenset) => {},
}),
```

### `TwitchAdapter`

This simply extends the `OidcAdapter` and is preconfigured with Twitch OIDC urls.

```js
TwitchAdapter({
  clientID: "<client-id>"
  onSuccess: async (tokenset) => {},
}),
```

### `LinkAdapter`

This adapter issues magic links that you can send over email or SMS to verify users without the need of a password.

You will need to implement an `onLink` callback to send the link through your preferred mechanism; email or SMS. Any query parameters included in the redirect from your frontend will be passed through in the `claims` argument. This is useful to include the email or phone number you will be sending the link to.

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

### Custom Adapters

You can create your own adapters for handling flows that do not work out of the box. A common example would be to conditionally use different providers based on multi-tenant configuration.

Here is an example:

```js
import { createAdapter } from "@serverless-stack/node/auth"

const google = GoogleAdapter({...})
const link = LinkAdapter({...})

export const MultiTenantAdapter = createAdapter(
  () => {
    const tenantID = useQueryParam("tenantID")
    const tenantInfo = Tenant.fromID(tenantID)

    if (tenantInfo.googleAuth)
      return google()

    return link()
  }
);
```

## Session

The `Session` module can be used to generate a response for the `onSuccess` callbacks across the various adapters.

### `queryParameter`

This issues a new `Session` and redirects to the specified url with a `token=xxx` query parameter added.

```js title="services/functions/auth.ts"
return Session.parameter({
  redirect: "https://example.com",
  type: "user",
  properties: {
    userID: user.userID,
  },
});
```

### cookie

The cookie strategy for Session management requires some additional configuration on your API but is less work on your frontend. The API will issue a cookie that can be automatically included with all future requests so your frontend does not have to think about token storage.

You must allow cookies to be sent cross-origin from your frontend, which is usually running on `localhost` during development and another subdomain in production.

Update your API with the correct `cors` options.

```js title="stacks/api.ts"
new Api(stack, "api", {
  cors: {
    allowCredentials: true,
    allowHeaders: ["content-type"],
    allowMethods: ["ANY"],
    allowOrigins: ["http://localhost:3000", "productionurl"],
  },
});
```

Then when creating the session use the `cookie` function instead of `queryParameter`.

```js title="services/functions/auth.ts"
return Session.cookie({
  redirect: "https://example.com",
  type: "user",
  properties: {
    userID: user.userID,
  },
});
```

In your frontend, when making requests to your API, make sure you specify `credentials: include` with the request so that the cookie is included.

#### fetch

```js
fetch("/path", {
  credentials: "include",
});
```

#### urql

```js
export const urql = createClient({
  fetchOptions: () => {
    return {
      credentials: include,
    };
  },
});
```

### `create`

You can also directly generate the token without doing a redirect. This is most useful in integration tests when creating dummy users to make requests to your API.

```js
const jwt = Session.create({
  type: "user",
  properties: {
    userID: user.userID,
  },
});
```

## FAQ

### Is Auth storing any sensitive data?

`Auth` is 100% stateless and all of its mechanisms are implemented through short lived JWT tokens. While there are some tradeoffs with this approach, it greatly reduces the complexity of the API, and simplifies the implementation. And doesn't need any third party services.

### What about password based auth?

As of now all of the `Auth` adapters can be implemented in a stateless way and do not require storing anything in a database.

Introducing password auth would require storing and retreiving password data. Additionally it requires more complicated integrations for register, login, reset password flows.

We strongly recommend passwordless flow to keep things simple for yourself and your users. That said if you are interested in passwords, talk to us in Discord.
