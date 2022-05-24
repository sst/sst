### Environment variables

The `ViteStaticSite` construct allows you to set the environment variables in your Vite app based on outputs from other constructs in your SST app. So you don't have to hard code the config from your backend. Let's look at how.

Vite supports [setting build time environment variables](https://vitejs.dev/guide/env-and-mode.html). In your JS files this looks like:


```js title="src/App.js"
console.log(import.meta.env.VITE_API_URL);
console.log(import.meta.env.VITE_USER_POOL_CLIENT);
```

You can pass these in directly from the construct.

```js {3-6}
new ViteStaticSite(stack, "Site", {
  path: "path/to/src",
  environment: {
    VITE_API_URL: api.url,
    VITE_USER_POOL_CLIENT: auth.cognitoUserPoolClient.userPoolClientId,
  },
});
```

Where `api.url` or `auth.cognitoUserPoolClient.userPoolClientId` are coming from other constructs in your SST app.

#### Type definitions

SST also creates a type definition file for the environment variables in `src/sst-env.d.ts`.

```ts
/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string
  readonly VITE_USER_POOL_CLIENT: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
```

This tells your editor the environment variables that are available and autocompletes them for you. 

![Vite environment variables autocomplete](/img/screens/vite-environment-variables-autocomplete.png)

You can also override the path for the generated type definitions file.

```js {7}
new ViteStaticSite(stack, "Site", {
  path: "path/to/src",
  environment: {
    VITE_API_URL: api.url,
    VITE_USER_POOL_CLIENT: auth.cognitoUserPoolClient.userPoolClientId,
  },
  typesPath: "types/my-env.d.ts",
});
```

#### While deploying

On `sst deploy`, the environment variables will first be replaced by placeholder values, `{{ VITE_API_URL }}` and `{{ VITE_USER_POOL_CLIENT }}`, when building the Vite app. And after the referenced resources have been created, the Api and User Pool in this case, the placeholders in the HTML and JS files will then be replaced with the actual values.

#### While developing

To use these values while developing, run `sst start` to start the [Live Lambda Development](/live-lambda-development.md) environment.

``` bash
npm start
```

Then in your Vite app to reference these variables, add the [`sst-env`](/packages/static-site-env.md) package.

```bash
npm install --save-dev @serverless-stack/static-site-env
```

And tweak the Vite `dev` script to:

```json title="package.json" {2}
"scripts": {
  "dev": "sst-env -- vite",
  "build": "vite build",
  "preview": "vite preview"
},
```

Now you can start your Vite app as usualy and it'll have the environment variables from your SST app.

``` bash
npm run dev
```

There are a couple of things happening behind the scenes here:

1. The `sst start` command generates a file with the values specified by `ViteStaticSite`'s `environment` prop.
2. The `sst-env` CLI will traverse up the directories to look for the root of your SST app.
3. It'll then find the file that's generated in step 1.
4. It'll load these as environment variables before running the start command.

:::note
`sst-env` only works if the Vite app is located inside the SST app or inside one of its subdirectories. For example:

```
/
  sst.json
  vite-app/
```
:::

### Custom domains

You can also configure custom domains for your Vite app. SST supports domains that are shoted either on [Route 53](https://aws.amazon.com/route53/) or externally.

Using the basic config for a domain hosted on [Route 53](https://aws.amazon.com/route53/).

```js {3}
new ViteStaticSite(stack, "Site", {
  path: "path/to/src",
  customDomain: "domain.com",
});
```

For more custom domain examples, check out the [`StaticSite examples`](StaticSite.md#configuring-custom-domains).

### More examples

For more examples, refer to the [`StaticSite`](StaticSite.md) snippets.
