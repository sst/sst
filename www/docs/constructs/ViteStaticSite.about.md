The `ViteStaticSite` construct is a higher level CDK construct that makes it easy to create a Vite single page app. It provides a simple way to build and deploy the site to an S3 bucket; setup a CloudFront CDN for fast content delivery; and configure a custom domain for the website URL.

It's designed to work with static sites built with [Vite](https://vitejs.dev/). It allows you to [automatically set environment variables](#configuring-environment-variables) in your Vite app directly from the outputs of your SST app. And it can also create a `.d.ts` type definition file for the environment variables.

The `ViteStaticSite` construct internally extends the [`StaticSite`](StaticSite.md) construct with the following pre-configured defaults.

- [`indexPage`](StaticSite.md#indexpage) is set to `index.html`.
- [`errorPage`](StaticSite.md#errorpage) is set to `redirect_to_index_page`. So error pages are redirected to the index page.
- [`buildCommand`](StaticSite.md#buildcommand) is `npm run build`.
- [`buildOutput`](StaticSite.md#buildoutput) is the `dist` folder in your Vite app.
- [`fileOptions`](StaticSite.md#fileoptions) sets the cache control to `max-age=0,no-cache,no-store,must-revalidate` for HTML files; and `max-age=31536000,public,immutable` for JS/CSS files.

## Examples

### Minimal Config

Deploys a Vite app in the `path/to/src` directory.

```js
new ViteStaticSite(stack, "Site", {
  path: "path/to/src",
});
```

### Environment variables

The `ViteStaticSite` construct allows you to set the environment variables in your Vite app based on outputs from other constructs in your SST app. So you don't have to hard code the config from your backend. Let's look at how.

Vite supports [setting build time environment variables](https://vitejs.dev/guide/env-and-mode.html). In your JS files this looks like:

```js title="src/App.js"
console.log(import.meta.env.VITE_API_URL);
console.log(import.meta.env.VITE_USER_POOL_CLIENT);
```

:::info
Vite only exposes environment variables prefixed with `VITE_` to your app.
:::

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
  readonly VITE_API_URL: string;
  readonly VITE_USER_POOL_CLIENT: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
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

```bash
npx sst start
```

Then in your Vite app to reference these variables, add the [`sst-env`](/packages/sst-env.md) package.

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

```bash
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
