---
title: Frontends
description: "Learn to deploy your frontend web app with SST."
---

import TabItem from "@theme/TabItem";
import MultiSiteCode from "@site/src/components/MultiSiteCode";

SST makes it easy to connect your web or mobile frontends to your backend resources. For web apps, SST also allows you to deploy them to AWS.

Let's start by looking at web apps.

## Web apps

SST provides a couple of constructs that allow you to build and deploy your web app to AWS. Internally these static sites are stored in [S3](https://aws.amazon.com/s3/), served through a [CloudFront](https://aws.amazon.com/cloudfront/) CDN for fast content delivery, and use [Amazon Route 53](https://aws.amazon.com/route53/) for custom domains.

### Frameworks

SST provides out of the box support for [Create React App](https://reactjs.org), [Vite](https://vitejs.dev/), [Next.js](https://nextjs.org), and any static site framework through the [`StaticSite`](constructs/StaticSite.md) construct.

<MultiSiteCode>
<TabItem value="next">

```js
new NextjsSite(stack, "Next", {
  path: "path/to/site",
});
```

</TabItem>
<TabItem value="react">

```js
new ReactStaticSite(stack, "React", {
  path: "path/to/site",
});
```

</TabItem>
<TabItem value="vite">

```js
new ViteStaticSite(stack, "Vite", {
  path: "path/to/site",
});
```

</TabItem>
<TabItem value="static">

```js
new StaticSite(stack, "Site", {
  path: "path/to/site",
});
```

</TabItem>
</MultiSiteCode>

Here the `path` points to the location of the frontend app. Note that the frontend app is built alongside the backend resources in the SST app. We'll look at why this is helpful below.

:::tip Example

Here are a couple of examples using your favorite frontend frameworks to build a simple full-stack click counter app with SST:

- [React example](https://sst.dev/examples/how-to-create-a-reactjs-app-with-serverless.html)
- [Next.js example](https://sst.dev/examples/how-to-create-a-nextjs-app-with-serverless.html)
- [Vue.js example](https://sst.dev/examples/how-to-create-a-vuejs-app-with-serverless.html)
- [Svelte example](https://sst.dev/examples/how-to-create-a-svelte-app-with-serverless.html)

:::

### CDN

SST deploys the static content of your web app to an S3 bucket, and then points a CloudFront distribution to the bucket. All static contents are served out from the CDN. The CDN cache is invalidated on every deploy.

### Domains

You can configure a custom domain (ie. `domain.com`) for your web app. And SST will also setup the http to https redirect. Visitors to the `http://domain.com` URL will be redirected to the `https://domain.com`.

<MultiSiteCode>
<TabItem value="next">

```js {3}
new NextjsSite(stack, "Next", {
  path: "path/to/site",
  customDomain: "domain.com",
});
```

</TabItem>
<TabItem value="react">

```js {3}
new ReactStaticSite(stack, "React", {
  path: "path/to/site",
  customDomain: "domain.com",
});
```

</TabItem>
<TabItem value="vite">

```js {3}
new ViteStaticSite(stack, "Vite", {
  path: "path/to/site",
  customDomain: "domain.com",
});
```

</TabItem>
<TabItem value="static">

```js {3}
new StaticSite(stack, "Site", {
  path: "path/to/site",
  customDomain: "domain.com",
});
```

</TabItem>
</MultiSiteCode>

#### Domain Alias

If a domain alias is configured, visitors to the alias domain will be redirected to the main one. So if `www.domain.com` is the domain alias for `domain.com`, visitors to `www.domain.com` will be redirected to `domain.com`.

<MultiSiteCode>
<TabItem value="next">

```js {5}
new NextjsSite(stack, "Next", {
  path: "path/to/site",
  customDomain: {
    domainName: "domain.com",
    domainAlias: "www.domain.com",
  },
});
```

</TabItem>
<TabItem value="react">

```js {5}
new ReactStaticSite(stack, "React", {
  path: "path/to/site",
  customDomain: {
    domainName: "domain.com",
    domainAlias: "www.domain.com",
  },
});
```

</TabItem>
<TabItem value="vite">

```js {5}
new ViteStaticSite(stack, "Vite", {
  path: "path/to/site",
  customDomain: {
    domainName: "domain.com",
    domainAlias: "www.domain.com",
  },
});
```

</TabItem>
<TabItem value="static">

```js {5}
new StaticSite(stack, "Site", {
  path: "path/to/site",
  customDomain: {
    domainName: "domain.com",
    domainAlias: "www.domain.com",
  },
});
```

</TabItem>
</MultiSiteCode>

### Environment variables

A benefit of deploying the frontend web app alongside the backend is to be able to pass backend resource references directly into the frontend code. This is done through the `environment` prop.

<MultiSiteCode>
<TabItem value="next">

```js {9-11}
const api = new Api(stack, "Api", {
  routes: {
    "GET /": "src/lambda.main",
  },
});

new NextjsSite(stack, "Next", {
  path: "path/to/site",
  environment: {
    NEXT_PUBLIC_API_URL: api.url,
  },
});
```

</TabItem>
<TabItem value="react">

```js {9-11}
const api = new Api(stack, "Api", {
  routes: {
    "GET /": "src/lambda.main",
  },
});

new ReactStaticSite(stack, "React", {
  path: "path/to/site",
  environment: {
    REACT_APP_API_URL: api.url,
  },
});
```

</TabItem>
<TabItem value="vite">

```js {9-11}
const api = new Api(stack, "Api", {
  routes: {
    "GET /": "src/lambda.main",
  },
});

new ReactStaticSite(stack, "React", {
  path: "path/to/site",
  environment: {
    VITE_API_URL: api.url,
  },
});
```

</TabItem>
<TabItem value="static">

```js {9-11}
const api = new Api(stack, "Api", {
  routes: {
    "GET /": "src/lambda.main",
  },
});

new StaticSite(stack, "Site", {
  path: "path/to/site",
  environment: {
    VUE_APP_API_URL: api.url,
  },
});
```

</TabItem>
</MultiSiteCode>

You can now reference the environment variable in your web app.

<MultiSiteCode>
<TabItem value="next">

```js
fetch(process.env.NEXT_PUBLIC_API_URL);
```

</TabItem>
<TabItem value="react">

```js
fetch(process.env.REACT_APP_API_URL);
```

</TabItem>
<TabItem value="vite">

```js
fetch(import.meta.env.VITE_API_URL);
```

</TabItem>
<TabItem value="static">

```js
fetch(process.env.VUE_APP_API_URL);
```

</TabItem>
</MultiSiteCode>

#### How passing environment variables works

If an environment contains a dynamic value that'll only be known after deploy, SST first builds the web app with a placeholder value, and then replaces the placeholder with the real value after deploying. In the example above, `api.url` is a dynamic value. The `url` is not known at build time if the `Api` construct has not been previously deployed. And the value can change if `Api` is to be replaced during deployment.

Given the following environment setting.

```js
environment: {
  REACT_APP_HELLO: "world",
  REACT_APP_API_URL: api.url,
}
```

SST builds the app with placeholders.

```bash
$ REACT_APP_API_URL="{{ REACT_APP_API_URL }}" REACT_APP_HELLO="world" npm run build
```

After the `Api` construct is deployed, SST will replace all occurrences of `{{ REACT_APP_API_URL }}` with the real value.

#### Editor autocomplete

The [`ViteStaticSite`](constructs/ViteStaticSite.md) construct also [creates a type definition file](constructs/ViteStaticSite.md#type-definitions) for the environment variables in `src/sst-env.d.ts`. This tells your editor the environment variables that are available and autocompletes them for you.

![Vite environment variables autocomplete](/img/screens/vite-environment-variables-autocomplete.png)

#### Next.js limitation

Since dynamic environment values are not known at build time, they cannot be used to fetch data in `getStaticProps`.

### Local development

To use the above environment variables while developing, first run `sst dev` to start the local environment.

```bash
npx sst dev
```

Then in your frontend app add the [`sst env`](../packages/sst.md#sst-env) command to reference these variables.

<MultiSiteCode>
<TabItem value="next">

```json title="package.json" {2}
"scripts": {
  "dev": "sst env \"next dev\"",
  "build": "next build",
  "start": "next start",
  "lint": "next lint"
},
```

</TabItem>
<TabItem value="react">

```json title="package.json" {2}
"scripts": {
  "start": "sst env \"react-scripts start\"",
  "build": "react-scripts build",
  "test": "react-scripts test",
  "eject": "react-scripts eject"
},
```

</TabItem>
<TabItem value="vite">

```json title="package.json" {2}
"scripts": {
  "dev": "sst env vite",
  "build": "tsc && vite build",
  "preview": "vite preview"
},
```

</TabItem>
<TabItem value="static">

```json title="package.json" {2}
"scripts": {
  "serve": "sst env \"vue-cli-service serve\"",
  "build": "vue-cli-service build",
  "lint": "vue-cli-service lint"
},
```

</TabItem>
</MultiSiteCode>

Now you can start your app as usual and it'll have the environment variables from your SST app.

Note that, the `sst env` CLI will traverse up the directories to look for the root of your SST app. If the static site or Next.js app is located outside the SST app folder, pass in [`--path`](../packages/sst.md#sst-env) to specify the relative path of the SST app.

```json title="package.json" {2}
"scripts": {
  "start": "sst env --path ../backend \"react-scripts start\"",
},
```

There are a couple of things happening behind the scenes here:

1. The `sst dev` command generates a file with the values specified by `StaticSite`, `ReactStaticSite`, `ViteStaticSite`, or `NextjsSite` construct's `environment` prop.
2. The `sst env` CLI will traverse up the directories to look for the root of your SST app. If the static site or Next.js app is located outside the SST app folder, pass in [`--path`](#--path) to specify the relative path of the SST app.
3. It'll then find the file that's generated in step 1.
4. It'll load these as environment variables before running the start command.

## Mobile apps

For mobile apps, you want to make sure to set the references to the backend resources as environment variables.

We have a couple of examples of creating mobile apps with [Expo](https://expo.dev) and [Flutter](https://flutter.dev).

:::tip Example

Learn how to build a click counter native mobile app with Expo, Flutter, and SST.

- [Expo example](https://sst.dev/examples/how-to-create-an-expo-app-with-serverless.html)
- [Flutter example](https://sst.dev/examples/how-to-create-a-flutter-app-with-serverless.html)

:::
