---
description: "Docs for the sst.ReactStaticSite construct in the @serverless-stack/resources package"
---

The `ReactStaticSite` construct is a higher level CDK construct that makes it easy to create a React single page app. It provides a simple way to build and deploy the site to an S3 bucket; setup a CloudFront CDN for fast content delivery; and configure a custom domain for the website URL. In addition:

- Visitors to the `http://` url will be redirected to the `https://` URL.
- If a [domain alias](#domainalias) is configured, visitors to the alias domain will be redirected to the main one. So if `www.example.com` is the domain alias for `example.com`, visitors to `www.example.com` will be redirected to `example.com`.

The `ReactStaticSite` construct internally extends the `StaticSite` construct with the following pre-configured defaults.
- [`indexPage`](StaticSite#indexpage) defaults to `index.html`
- [`errorPage`](StaticSite#errorpage) defaults to [`StaticSiteErrorOptions.REDIRECT_TO_INDEX_PAGE`](StaticSite#staticsiteerroroptions). Error pages redirected to the index page.
- [`buildCommand`](StaticSite#buildcommand) defaults to `npm run build`
- [`buildOutput`](StaticSite#buildoutput) defaults to the `build` folder in your React app
- [`fileOptions`](StaticSite#fileoptions) defaults to setting cache control to `max-age=0,no-cache,no-store,must-revalidate` for HTML files; and `max-age=31536000,public,immutable` for JS/CSS files

## Initializer

```ts
new ReactStaticSite(scope: Construct, id: string, props: ReactStaticSiteProps)
```

_Parameters_

- scope [`Construct`](https://docs.aws.amazon.com/cdk/api/latest/docs/constructs.Construct.html)
- id `string`
- props [`ReactStaticSiteProps`](#reactstaticsiteprops)

## Examples

The `ReactStaticSite` construct is designed to make it easy to get started with, while allowing for a way to fully configure it as well. Let's look at how, through a couple of examples.

### Creating a React site

Deploys a React website in the `path/to/src` directory.

```js
new ReactStaticSite(this, "ReactSite", {
  path: "path/to/src",
});
```

### Configuring React environment variables

Configuring environment values in your website content with the deployed values. So you don't have to hard code the config from your backend.

```js {3-6}
new ReactStaticSite(this, "ReactSite", {
  path: "path/to/src",
  environment: {
    REACT_APP_API_URL: api.url,
    REACT_APP_USER_POOL_CLIENT: auth.cognitoUserPoolClient.userPoolClientId,
  },
});
```

And in your React app, you can reference environment variables in HTML files:
```html title="public/index.html"
<p>Api endpoint is: %REACT_APP_API_URL%</p>
```

And in JS files:
```js title="src/App.js"
console.log(process.env.REACT_APP_API_URL);
console.log(process.env.REACT_APP_USER_POOL_CLIENT);
```

On `sst deploy`, the environment variables will first be replaced by placeholder values ie. `{{ REACT_APP_API_URL }}` and `{{ REACT_APP_USER_POOL_CLIENT }}` when building the React app. And after the referenced resources have been created ie. Api and User Pool, the placeholders will then be replaced by the actual values.

On `sst start`, you can start your React app using the deployed values:
```bash
REACT_APP_API_URL=https://api.example.com REACT_APP_USER_POOL_CLIENT=abcdef1234 npm run start
```

Alternatively, you can use the `sst-env` CLI to load the environment variables automatically for you.
```bash
npm install --save-dev @serverless-stack/static-site-env
```

And change your React `start` script to:
```json title="package.json"
  "scripts": {
    "start": "sst-env -- react-scripts start",
    "build": "react-scripts build",
    "test": "react-scripts test",
    "eject": "react-scripts eject"
  },
```

Behind the scene, `sst start` generates a file with the values required by `ReactStaticSite`'s `environment` prop. And when starting up the React app, `sst-env` will look for the generated file; configure the environment variables; and then starts React.

:::note
`sst-env` only works if the React app is located inside the SST app or inside one of the subfolders. For example:
```
/
  sst.jon
  react-app/
```
:::

## Properties

Refer to the properties in the [`StaticSite`](StaticSite#properties) construct.

## ReactStaticSiteProps

Takes the following construct props in addition to the [`StaticSiteProps`](StaticSite.md#staticsiteprops).

### environment

_Type_ : `{ [key: string]: string }`

An associative array with the key being the React environment variable name. Environment variables must start with `REACT_APP_`.

```js
{
  REACT_APP_API_URL: api.url,
}
```
