---
description: "Docs for the sst.ReactStaticSite construct in the @serverless-stack/resources package"
---

:::caution
This is the SST v0.x Constructs doc. SST v1 is now released. If you are using v1, see the [v1 Constructs doc](/constructs). If you are looking to upgrade to v1, [check out the migration steps](/constructs/v0/migration).
:::

The `ReactStaticSite` construct is a higher level CDK construct that makes it easy to create a React single page app. It provides a simple way to build and deploy the site to an S3 bucket; setup a CloudFront CDN for fast content delivery; and configure a custom domain for the website URL.

It's designed to work with static sites built with [Create React App](https://create-react-app.dev). It also allows you to [automatically set environment variables](#configuring-environment-variables) in your React app directly from the outputs of your SST app.

The `ReactStaticSite` construct internally extends the [`StaticSite`](StaticSite.md) construct with the following pre-configured defaults.

- [`indexPage`](StaticSite.md#indexpage) is set to `index.html`.
- [`errorPage`](StaticSite.md#errorpage) is set to [`StaticSiteErrorOptions.REDIRECT_TO_INDEX_PAGE`](StaticSite.md#staticsiteerroroptions). So error pages are redirected to the index page.
- [`buildCommand`](StaticSite.md#buildcommand) is `npm run build`.
- [`buildOutput`](StaticSite.md#buildoutput) is the `build` folder in your React app.
- [`fileOptions`](StaticSite.md#fileoptions) sets the cache control to `max-age=0,no-cache,no-store,must-revalidate` for HTML files; and `max-age=31536000,public,immutable` for JS/CSS files.

## Initializer

```ts
new ReactStaticSite(scope: Construct, id: string, props: StaticSiteProps)
```

_Parameters_

- scope [`Construct`](https://docs.aws.amazon.com/cdk/api/v2/docs/constructs.Construct.html)
- id `string`
- props [`StaticSiteProps`](StaticSite.md#staticsiteprops)

## Examples

The `ReactStaticSite` construct is designed to make it easy to work with React apps created using [Create React App](https://create-react-app.dev/) or similar projects.

### Creating a React app

Deploys a React app in the `path/to/src` directory.

```js
new ReactStaticSite(this, "ReactSite", {
  path: "path/to/src",
});
```

### Configuring environment variables

The `ReactStaticSite` construct allows you to set the environment variables in your React app based on outputs from other constructs in your SST app. So you don't have to hard code the config from your backend. Let's look at how.

Create React App supports [setting build time environment variables](https://create-react-app.dev/docs/adding-custom-environment-variables/). In your JS files this looks like:

```js title="src/App.js"
console.log(process.env.REACT_APP_API_URL);
console.log(process.env.REACT_APP_USER_POOL_CLIENT);
```

And in your HTML files:

```html title="public/index.html"
<p>Api endpoint is: %REACT_APP_API_URL%</p>
```

You can pass these in directly from the construct.

```js {3-6}
new ReactStaticSite(this, "ReactSite", {
  path: "path/to/src",
  environment: {
    REACT_APP_API_URL: api.url,
    REACT_APP_USER_POOL_CLIENT: auth.cognitoUserPoolClient.userPoolClientId,
  },
});
```

Where `api.url` or `auth.cognitoUserPoolClient.userPoolClientId` are coming from other constructs in your SST app.

#### While deploying

On `sst deploy`, the environment variables will first be replaced by placeholder values, `{{ REACT_APP_API_URL }}` and `{{ REACT_APP_USER_POOL_CLIENT }}`, when building the React app. And after the referenced resources have been created, the Api and User Pool in this case, the placeholders in the HTML and JS files will then be replaced with the actual values.

#### While developing

To use these values while developing, run `sst start` to start the [Live Lambda Development](../../live-lambda-development.md) environment.

```bash
npx sst start
```

Then in your React app to reference these variables, add the [`sst-env`](../../packages/sst-env.md) package.

```bash
npm install --save-dev @serverless-stack/static-site-env
```

And tweak the React `start` script to:

```json title="package.json" {2}
"scripts": {
  "start": "sst-env -- react-scripts start",
  "build": "react-scripts build",
  "test": "react-scripts test",
  "eject": "react-scripts eject"
},
```

Now you can start your React app as usualy and it'll have the environment variables from your SST app.

```bash
npm run start
```

There are a couple of things happening behind the scenes here:

1. The `sst start` command generates a file with the values specified by `ReactStaticSite`'s `environment` prop.
2. The `sst-env` CLI will traverse up the directories to look for the root of your SST app.
3. It'll then find the file that's generated in step 1.
4. It'll load these as environment variables before running the start command.

:::note
`sst-env` only works if the React app is located inside the SST app or inside one of its subdirectories. For example:

```
/
  sst.json
  react-app/
```

:::

### Configuring custom domains

You can also configure custom domains for your React app. SST supports domains that are shoted either on [Route 53](https://aws.amazon.com/route53/) or externally.

Using the basic config for a domain hosted on [Route 53](https://aws.amazon.com/route53/).

```js {3}
new ReactStaticSite(this, "ReactSite", {
  path: "path/to/src",
  customDomain: "domain.com",
});
```

For more custom domain examples, check out the [`StaticSite examples`](StaticSite.md#configuring-custom-domains).

## Properties

Refer to the properties in the [`StaticSite`](StaticSite#properties) construct.
