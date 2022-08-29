---
title: Auth
description: "Learn to manage users and authentication in your SST app."
---

SST Auth is a lightweight authentication solution for your applications. With a simple set of configuration you can deploy a function attached to your API that can handle various authentication flows.

## Overview

SST Auth is composed of the following pieces:

1. A construct that can be attached to your API that provides authentication routes.
   - Handles secure generation of RSA keypair to sign sessions
2. `AuthHandler` that can be used to define an authenticator function that handles authentication flows across various providers.
   - High level adapters for common providers like Google and Twitch
   - OIDC and OAuth adapters that work with any compatible service
   - Link adapter to generate login links that can be sent over email or SMS
   - Can be extended with custom adapters to support more complex workflows, like multi-tenant SSO
3. `Session` library for issuing and validating authentication sessions.
   - Implemented with stateless JWT tokens that are signed with public/private keypairs
   - Various strategies for passing token to frontend (query parameter or cookie)
   - Fully typesafe to ensure session issuing and validating 

## Architecture

Auth is thought to be complex but with modern standards, it is simple to implement. Managed auth services you may have tried before tend to bundle many several seemingly related features together which usually leads to a challenging situations.

SST Auth is designed quite differently from those services. The typical authentication flow can be thought of like this:

1. Perform handshake with authentication strategy. This could be OAuth with a third party provider or something as simple as an email link that needs to be clicked.
2. The result of this handshake is a set of validated claims about who the user is, like their email. These claims should be looked up in a user database to see if the user exists, creating the user otherwise.
3. A session token should be generated so that following requests contain information about which user is making them.

The key here is SST Auth has out of the box support for steps 1 and 3. It **intentionally** does not manage user storage. These details tend to be very specific to your application and is best if they live alongside the rest of your data and business logic.

The seperation of responsibilities into things that are undifferentiated (1 + 3) and things that are not (2) is what makes SST Auth powerful and flexible to even the most complex authentication scenarios.

## Setup

### Create AuthHandler

Create a new function in your functions folder that will handle authentication requests. Typically this will be in `services/functions/auth.ts`.

`AuthHandler` returns an authenticator function that do authentication handshakes and issue sessions with simple configuration.
We'll leave the provider configuration empty for now.

```ts title="services/functions/auth.ts"
import { AuthHandler } from "@serverless-stack/node/auth"
export const handler = AuthHandler({
  providers: {},
})
```

### Setup construct

SST Auth works by adding additional routes to your API to handle authentication. Import the construct, attach it to your API and point it to your auth function. You can use the same auth construct with multiple APIs.

```js title="stacks/api.ts"
import { Auth } from "@serverless-stack/resources"

const auth = new Auth(stack, "auth", {
  authenticator: "functions/auth.handler",
})

auth.attach(stack, {
  api: myApi,
  prefix: "/auth" // optional
})
```

### Add a provider

The AuthHandler can be configured with a set of providers that your system supports. Here's an example of configuring a provider named "google" that uses the GoogleAdapter in OIDC mode.

```js {6-15} title="services/functions/auth.ts"
import { AuthHandler } from "@serverless-stack/node/auth"
import { Config } from "@serverless-stack/node/config"

export const handler = AuthHandler({
  providers: {
    google: new GoogleAdapter({
      mode: "oidc",
      clientID: Config.GOOGLE_CLIENT_ID,
      onSuccess: async (tokenset) => {
        return {
          statusCode: 200,
          body: JSON.stringify(tokenset.claims())
        }
      }
    })
  },
})
```

This will create a route for initializing the auth flow at `/auth/google/authorize` and another for receiving the callback from Google at `/auth/google/callback`. Be sure to add this callback in Google's Oauth configuration.

Note this makes use of [SST Config](/environment-variables) which allows you to easily manage your secret values. You will need to update your stacks code to make sure the secret is available to your function.

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

You can follow the Config docs to understand how to set values across your various stages.

At this point your frontend can redirect to `/auth/<provider-name>/authorize` to kick off the authentication flow. If everything is configured right your browser will print out the set of claims returned from Google.

You can also visit `/auth/` to see a list of your configured providers and the authorization URL.

### Create session


For a real application you'll want to handle User lookup/creation in the `onSuccess` callback. SST Auth very intentionally avoids providing abstractions for user management, these tend to be very specific to what you're building so this should be managed by you.

However, we do provide a way to create a session once you have retreived the User.

When using Typescript you can define the various session types in your application so that creating them and retreiving them in requests is completely typesafe.

```js title="services/functions/auth.ts"
declare module "@serverless-stack/node/auth" {
  export interface SessionTypes {
    user: {
      userID: string
      tenantID: string // example for a multi tenant app
    }
  }
}
```

At first you may only have a `user` session that represents a user and contains a `userID` in its properties. In the future you may support other types of sessions like an `apikey` that represents server to server communication.

Once the session type is defined, you can update your `onSuccess` callback to do user lookup and creation from the claims. Once you know the userID, you can generate create a new session and redirect them back to your frontend with the token in the query parameter.

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

### Using the session

The session token must be passed by your frontend in a header in this format: `authorization: Bearer <token>` for all authenticated requests.

This allows you to retreive the session with `useSession()`. Here's an example of a GraphQL query that uses the current user.

```js title="services/functions/graphql/types/foo.ts"
builder.mutationFields(t => ({
  createTask: t.field({
    type: TaskType,
    resolve: () => {
      const session = useSession()
      if (session.type !== "user") throw new Error("Must be logged in")
      return Task.create(session.properties.userID)
    }
  })
}))
```

The `useSession` hook relies on SST's context system to discover the authentication token. If using the `GraphQLHandler` it will transparently initialize this system so everything should work without additional configuration. 

There is also a barebones `Handler` function that can be used to handle other types of requests. Here's how you'd implement a typical API request to a rest route handled by a lambda. Since this is typesafe, `event` will be properly typed as will the expected response type.

```js title="services/functions/rest/foo.ts"
import { Handler } from "@serverless-stack/node/context"

export const getSessionTypeHandler = Handler("api", async (event) => {
  const session = useSession()

  return {
    statusCode: 200,
    body: session.type
  }
})
```

## Adapters

Adapters provide out of the box functionality for various authentication providers and are used to configure providers. This includes third parties over OAuth and OIDC as well as internal flows like magic link.

### OauthAdapter

A general adapter for any Oauth2 compatible service.

```js
import { Issuer } from "openid-client";

OauthAdapter({
  issuer: new Issuer({
    issuer: "<issuer-namespace>",
    authorization_endpoint: "<authorization-endpoint>",
    token_endpoint: "<token-endpoint>"
  }),
  clientID: "<client-id>",
  clientSecret: "<client-secret>",
  scope: "<space seperated list of scopes>",
  prompt: "<prompt>", // optional
  onSuccess: (tokenset) => {}
})
```

### OidcAdapter

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


### GoogleAdapter

The google adapter supports both OIDC and Oauth mode. Use OIDC when you only need to authenticate who the user is and retreive their email + name. Use Oauth when you need the user to grant you access to additional scopes like reading their calendar.

#### oidc
```js
GoogleAdapter({
  mode: "oidc",
  clientID: "<client-id>",
  onSuccess: async (tokenset) => {}
}),
```

#### oauth
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

### GithubAdapter

The GithubAdapter simply extends the OauthAdapter preconfigured with Github oauth urls.

```js
GithubAdapter({
  clientID: "<client-id>" 
  clientSecret: "<client-secret>",
  scope: "<space seperated list of scopes>",
  onSuccess: async (tokenset) => {},
}),
```

### TwitchAdapter

The TwitchAdapter simply extends the OidcAdapter preconfigured with Twitch oidc urls.

```js
TwitchAdapter({
  clientID: "<client-id>" 
  onSuccess: async (tokenset) => {},
}),
```

### LinkAdapter

The link adapter issues magic links that you can send over email or SMS to verify users without the need of a password.

You will need to implement an `onLink` callback to send the link through your preferred mechanism. Any query parameters included in the redirect from your frontend will be passed through in the `claims` argument. This is useful to include the email or phone number you will be sending the link to.

```js
// Frontend
location.href = "https://api.example.com/auth/link/authorize?email=user@example.com"

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
})
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

The Session module can be used to generate a response for the `onSuccess` callbacks across the various adapters.

### queryParameter

This issues a new Session and redirects to the specified url with a `token=xxx` query parameter added.
```js title="services/functions/auth.ts"
return Session.parameter({
  redirect: "https://example.com",
  type: "user",
  properties: {
    userID: user.userID
  },
})
```

### cookie

The cookie strategy for Session management requires some additional configuration on your API but is less work on your frontend. The API will issue a cookie that can be automatically included with all future requests so your frontend does not have to think about token storage.

You must allow cookies to be sent cross-origin from your frontend, which is usually running on `localhost` during development and another subdomain in production.

Update your API with the correct `cors` options

```js title="stacks/api.ts"
new Api(stack, "api", {
  cors: {
    allowCredentials: true,
    allowHeaders: ['content-type'],
    allowMethods: ['ANY'],
    allowOrigins: ['http://localhost:3000', 'productionurl'],
  },
})
```

Then when creating the session use the `cookie` function instead of `queryParameter`

```js title="services/functions/auth.ts"
return Session.cookie({
  redirect: "https://example.com",
  type: "user",
  properties: {
    userID: user.userID
  },
})
```

In your frontend when making requests to your api, make sure you specify `credentials: include` with the request so that the cookie is included.

#### fetch

```js
fetch("/path", {
  credentials: "include"
})
```

#### urql

```js
export const urql = createClient({
  fetchOptions: () => {
    return {
      credentials: include
    }
  },
})
```

### create

You can also directly generate the token and then handle it however you want. This is most useful in integration tests when creating dummy users to make requests to your API.

```js
const jwt = Session.create({
  type: "user",
  properties: {
    userID: user.userID
  },
})
```

## FAQ

### Is SST Auth storing any sensitive data?

SST Auth is 100% stateless and all of its mechanisms are implemented through short lived JWT tokens. While there are some tradeoffs with this approach it greatly reduces the complexity of the API and simplifies the implementation.

### What about password based auth?

As of now all of SST Auth's adapters can be implemented in a stateless way and do not require storing anything in a database.

Introducing password auth would require storing and retreiving password data. Additionally it requires more complicated integrations for registering, logging in, reset password flows, which we cannot handle much of automatically since there are heavy UX implications.

We strongly recommend passwordless auth mechanisms to keep things simple for yourself and your users. That said if you are interested in passwords drop us a message in our [Discord](https://discord.gg/sst) and we can chat about your needs.

