---
title: Auth
description: "Learn to manage users and authentication in your SST app."
---

SST Auth is a lightweight authentication solution for your applications. With a simple set of configuration you can deploy a function attached to your API that can handle various authentication flows.

When compared to other alternatives like Cognito, SST Auth does much less. It's focused entirely on handling the authentication flow and not on application level concerns like user storage or permissions. This is an intentional decision and it allows for simplicity and flexibility while supporting things that are difficult with other solutions, like integration testing, multi-tenancy and typesafety.


### Features
- Designed to work with OAuth and OIDC providers
- Out of the box support for popular sign-in services
- Support for magic link based login
- Utilities for creating and retreiving sessions
- Can be extended with custom providers to support more complex workflows, like multi-tenant SSO

## Setup

### Create AuthHandler

Create a new function in your functions folder that will handle authentication requests. Typically this will be in `services/functions/auth.ts`. We'll leave the provider configuration empty for now.

```ts title="services/functions/auth.ts"
import { AuthHandler } from "@serverless-stack/node/auth"
export const handler = AuthHandler({
  providers: {},
})
```

### Attach to API

SST Auth works by adding additional routes to your API to handle authentication. Import the construct and attach it to your API and point it to your auth function.

```js title="stacks/api.ts"
import { Auth } from "@serverless-stack/resources"

new Auth(stack, "auth", {
  api: myApi,
  function: "functions/auth.handler",
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


### Create session

At this point your frontend can redirect to `/auth/google/authorize` to kick off the authentication flow. If everything is configured right your browser will print out the set of claims returned from Google.

For a real application you'll want to handle User lookup/creation in the `onSuccess` callback. SST Auth very intentionally avoids providing abstractions for user management, these tend to be very specific to what you're building so should be managed by you.

However we do provide a way to issue a session once you have retreived the User. 

First make sure to generate an `SST_AUTH_TOKEN` to securely sign your tokens.

```bash
sst secrets set SST_AUTH_TOKEN $(openssl rand -hex 24)
```

Then, if you're using Typescript, you can define the shape of your various sessions like this.

```js title="services/functions/auth.ts"
declare module "@serverless-stack/node/auth" {
  export interface SessionTypes {
    user: {
      userID: string
    }
  }
}
```

This declares a new session of type `user` which will contain a `userID` in its properties. Then you can update your `onSuccess` callback to a token representing the session and redirect the user. 

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
        const user = /* lookup user by claims.email or create if they don't exist */

        // Will redirect to https://example.com?token=xxx
        return Session.parameter({
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

In this case we're forwarding the token through a query parameter but we also support cookies, which requires a bit more configuratioin but reduces the burden on your frontend.

### Using the session

The session token can either be passed as a cookie, which will happen automatically with the cookie strategy, or passed explicitly by your frontend in a header: `authorization: Bearer <token>`.

Then you can retreive the session with `useSession()`. Here's an example of a GraphQL query to return 

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

If you are not using our GraphQL handler and instead using normal REST routes, be sure to define your function with the `Handler` function.

```js title="services/functions/rest/foo.ts"
export const handler = Handler("api", async () => {
  const session = useSession()
})
```

## Adapters

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
location.href = "https://api.example.com/auth/link/start?email=user@example.com"

// Provider configuration
LinkAdapter({
  onLink: async (link, claims) => {
    emailLinkTo(claims.email, link)
  },
  onSuccess: async (claims) => {
    const user = User.fromEmail(claims.email)
    // Create session
  },
})
```

## Session

The Session module can be used to generate a response for the `onSuccess` callbacks across the various adapters. It'll generate a session and redirect the user back to your frontend. Note this depends on a secret being set: `SST_AUTH_TOKEN`

### parameter

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

The cookie strategy for Session management requires some additional configuration on your API but less work on your frontend. You must allow cookies to be sent cross-origin from your frontend, which is usually running on `localhost` during development and another subdomain in production.

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

Then in your frontend when making `fetch` requests to your api, make sure you specify `credentials: include` with the request.
