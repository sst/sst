## Auth

This is a preview of the next version of SST Auth which aims to be more compliant with the oauth specification. You can see real-world usage of it here: https://github.com/sst/console/blob/dev/packages/functions/src/auth.ts


### Using the construct

```js
import { Auth } from "sst/constructs/future"

const secrets = Config.Secret.create(
  stack,
  "GITHUB_CLIENT_ID",
  "GITHUB_CLIENT_SECRET"
)


const auth = new Auth(stack, "auth", {
  authenticator: {
    handler: "packages/functions/src/auth.handler",
    bind: [secrets.GITHUB_CLIENT_ID, secrets.GITHUB_CLIENT_SECRET]
  },
})

const api = new Api(stack, "api", {
  defaults: {
    function: {
      bind: [auth]
    }
  },
  routes: {
    // routes
  },
})
```

`packages/functions/src/sessions.ts`
```js
// define session types
export const sessions = createSessionBuilder<{
  user: {
    userID: string
  }
}>()
```

`packages/functions/src/auth.handler`
```js
import {
  AuthHandler,
  GithubAdapter,
  createSessionBuilder,
} from "sst/node/future/auth";
import { Config } from "sst/node/config";
import { sessions } from "./sessions"


export const handler = AuthHandler({
  sessions,
  providers: {
    github: GithubAdapter({
      scope: "read:user user:email",
      clientID: Config.GITHUB_CLIENT_ID,
      clientSecret: Config.GITHUB_CLIENT_SECRET,
    }),
  },
  callbacks: {
    auth: {
      async success(input, response) {
        let user: User.Info | undefined = undefined
        if (input.provider === "github") {
          const user = // lookup or create user
          return response.session({
            type: "user",
            properties: {
              userID: user.userID,
            },
          })
        }
        throw new Error("Unknown provider")
      },
    }
  },
})

```

The auth construct will return an `auth.url` which you can redirect to in order to begin the auth process

#### Directly from frontend

Stacks code
```js
new StaticSite({
  environment: {
    AUTH_URL: auth.url
  }
})
```

In frontend
```js
const params = new URLSearchParams({
  client_id: "local",
  redirect_uri: location.origin,
  response_type: "token",
  provider: "github",
})
location.href = import.meta.env.AUTH_URL + "/authorize?" + params.toString()
```

This will redirect the user to github auth and when auth is complete they will be redirected back to the frontend with `#access_token=<token>` in the URL. You can parse it like this and store it in local storage or a cookie.

```js
const access_token = new URLSearchParams(window.location.hash.substring(1)).get("access_token")
```

And then in all requests to the API be sure to include `authorization: Bearer <token>` in all your requests to the API

#### SSR Sites

You can use the direct approach for SSR sites but you can also implement a more secure flow by doing the entire handshake on the server.

You can start by redirecting the user to the auth flow and specifying the redirect to an SSR url
```js
const params = new URLSearchParams({
  client_id: "local",
  redirect_uri: "<SSR_URL>/auth/callback",
  response_type: "code",
  provider: "github",
})
location.href = import.meta.env.AUTH_URL + "/authorize?" + params.toString()
```

Once the auth flow is done the user will be redirected to the callback url with a code in the query string. You can exchange this code for an access_token and store it in a cookie to be included with all future requests.

Example in an Astro API route:
```js
import { Auth } from "sst/node/future/auth"

export async function get(ctx: APIContext) {
  const code = ctx.url.searchParams.get("code")
  if (!code) {
    throw new Error("Code missing")
  }
  const response = await fetch(Auth.auth.url + "/token", {
    method: "POST",
    body: new URLSearchParams({
      grant_type: "authorization_code",
      client_id: "local",
      code,
      redirect_uri: `${ctx.url.origin}${ctx.url.pathname}`,
    }),
  }).then((r) => r.json())
  ctx.cookies.set("sst_auth_token", response.access_token, {
    maxAge: 60 * 60 * 24 * 30,
    path: "/",
  })
  return ctx.redirect("/wherever", 302)
}
```

### Accessing the session in your API or SSR

Make sure the auth construct is bound to your API like in the example above. Then you can just call `sessions.use()` to access the current session. It also provides `sessions.verify("mytoken")` if you want to manually pass in a token.

```js
import { ApiHandler } from "sst/node/api"
import { sessions } from "../sessions"

export const handler = ApiHandler(() => {
  const session = sesssions.use()
})
```

It will return `{ type: "public" }` if auth is missing or invalid

If you need to access the session in a different project you can share types and initialize `createSessionBuilder()`

```js
import { sessions } from "@myproject/functions/auth-handler"

const sessions = createSessionBuilder<typeof sessions.$type>()
```
