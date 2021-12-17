---
title: Frontend 🟢
description: "How to deploy frontend in your SST app"
---

import TabItem from "@theme/TabItem";
import MultiSiteCode from "@site/src/components/MultiSiteCode";

SST provides a simple way to build and deploy your frontend to an S3 bucket; setup a CloudFront CDN for fast content delivery; and configure a custom domain for the website URL.

## Web Apps

Build a click Counter app with SST and your favorite frontend framework:

- [React Counter app](https://serverless-stack.com/examples/how-to-create-a-reactjs-app-with-serverless.html) using ReactStaticSite
- [Next.js Counter app](https://serverless-stack.com/examples/how-to-create-a-nextjs-app-with-serverless.html) using NextjsSite
- [Vue Counter app](https://serverless-stack.com/examples/how-to-create-a-vuejs-app-with-serverless.html) using StaticSite
- [Svelte Counter app](https://serverless-stack.com/examples/how-to-create-a-svelte-app-with-serverless.html) using StaticSite

### CDN

SST deploys the static content to an S3 buket, and then configures a CloudFront distribution pointing to the S3 bucket. All static contents are served out from the CDN. The CDK cache is invalidated on every deploy.

### Domains

You can configure a custom domain (ie. `domain.com`) for your web app. And SST will also setup the `http` to `https` redirect. Visitors to the http://domain.com url will be redirected to the https://domain.com.

<MultiSiteCode>
<TabItem value="next">

```js
new NextjsSite(this, "Next", {
  path: "path/to/site",
  customDomain: "domain.com",
});
```

</TabItem>
<TabItem value="react">

```js
new ReactStaticSite(this, "React", {
  path: "path/to/site",
  customDomain: "domain.com",
});
```

</TabItem>
<TabItem value="static">

```js
new StaticSite(this, "Site", {
  path: "path/to/site",
  customDomain: "domain.com",
});
```

</TabItem>
</MultiSiteCode>

#### Domain Alias

If a domain alias is configured, visitors to the alias domain will be redirected to the main one. So if `www.example.com` is the domain alias for `example.com`, visitors to `www.example.com` will be redirected to `example.com`.

<MultiSiteCode>
<TabItem value="next">

```js
new NextjsSite(this, "Next", {
  path: "path/to/site",
  customDomain: {
    domainName: "domain.com",
    domainAlias: "www.domain.com",
  },
});
```

</TabItem>
<TabItem value="react">

```js
new ReactStaticSite(this, "React", {
  path: "path/to/site",
  customDomain: {
    domainName: "domain.com",
    domainAlias: "www.domain.com",
  },
});
```

</TabItem>
<TabItem value="static">

```js
new StaticSite(this, "Site", {
  path: "path/to/site",
  customDomain: {
    domainName: "domain.com",
    domainAlias: "www.domain.com",
  },
});
```

</TabItem>
</MultiSiteCode>

### Environment

A benefit of deploying the frontend web app alongside the backend is to be able to pass backend resources directly into the frontend code. This is done through the **environment**.

<MultiSiteCode>
<TabItem value="next">

```js
const api = new Api(this, "Api", {
  routes: {
    "GET /": "src/lambda.main",
  },
});

new NextjsSite(this, "Next", {
  path: "path/to/site",
  environment: {
    NEXT_PUBLIC_API_URL: api.url,
  },
});
```

</TabItem>
<TabItem value="react">

```js
const api = new Api(this, "Api", {
  routes: {
    "GET /": "src/lambda.main",
  },
});

new ReactStaticSite(this, "React", {
  path: "path/to/site",
  environment: {
    REACT_APP_API_URL: api.url,
  },
});
```

</TabItem>
<TabItem value="static">

```js
const api = new Api(this, "Api", {
  routes: {
    "GET /": "src/lambda.main",
  },
});

new StaticSite(this, "Site", {
  path: "path/to/site",
  environment: {
    VUE_APP_API_URL: api.url,
  },
});
```

</TabItem>
</MultiSiteCode>

And you can reference the environment variable in your web app.

<MultiSiteCode>
<TabItem value="next">

```js
fetch(process.env.NEXT_PUBLIC_API_URL).then(...);
```

</TabItem>
<TabItem value="react">

```js
fetch(process.env.REACT_APP_API_URL).then(...);
```

</TabItem>
<TabItem value="static">

```js
fetch(process.env.VUE_APP_API_URL).then(...);
```

</TabItem>
</MultiSiteCode>

#### How environment works

If an environment contains dynamic value whose value is only known after deploy, SST first builds the web app with a placeholder value, and then replaces the placeholder with the real value after deploying. In the example above, `api.url` is a dynamic value. The `url` is not known at build time if the `Api` has not been previously deployed. And the value can change if `Api` is required to be replaced during deployment.

Given the environment setting.

```js
environment: {
  REACT_APP_API_URL: api.url,
  REACT_APP_HELLO: "world",
}
```

SST builds the app with placeholder.

```bash
$ REACT_APP_API_URL="{{ REACT_APP_API_URL }}" REACT_APP_HELLO="world" npm run build
```

After `Api` is deployed, SST will replace all occurence of `{{ REACT_APP_API_URL }}` with the real value.

#### Next.js Limitation

Since dynamic environment values are not known at build time, they cannot be used to fetch data in `getStaticProps`.

### Atomic Deploys

If you are using `ReactStaticSite` and `StaticSite`, each deploy is uploaded to a new folder inside the S3 bucket. And the CloudFront distribution is updated to point to the new folder.

### Local Development

To use these values while developing, run `sst start` to start the local environment.

```bash
npx sst start
# or
yarn start
# or
npm start
```

Then in your app to reference these variables, add the `sst-env` package.

```bash
npm install --save-dev @serverless-stack/static-site-env
# or
yarn add --dev @serverless-stack/static-site-env
```

And tweak the `start` script to:

<MultiSiteCode>
<TabItem value="next">

```json title="package.json" {2}
"scripts": {
  "dev": "sst-env -- next dev",
  "build": "next build",
  "start": "next start",
  "lint": "next lint"
},
```

</TabItem>
<TabItem value="react">

```json title="package.json" {2}
"scripts": {
  "start": "sst-env -- react-scripts start",
  "build": "react-scripts build",
  "test": "react-scripts test",
  "eject": "react-scripts eject"
},
```

</TabItem>
<TabItem value="static">

```json title="package.json" {2}
"scripts": {
  "serve": "sst-env -- vue-cli-service serve",
  "build": "vue-cli-service build",
  "lint": "vue-cli-service lint"
},
```

</TabItem>
</MultiSiteCode>

Now you can start your app as usual and it'll have the environment variables from your SST app.

There are a couple of things happening behind the scenes here:

1. The `sst start` command generates a file with the values specified by `StaticSite`'s `environment` prop.
2. The `sst-env` CLI will traverse up the directories to look for the root of your SST app.
3. It'll then find the file that's generated in step 1.
4. It'll load these as environment variables before running the start command.

:::note
`sst-env` only works if the web app is located inside the SST app or inside one of its subdirectories. For example:

```
/
  sst.json
  frontend/
```

:::

## Mobile Apps

- [Expo Counter app](https://serverless-stack.com/examples/how-to-create-an-expo-app-with-serverless.html)
- [Flutter Counter app](https://serverless-stack.com/examples/how-to-create-a-flutter-app-with-serverless.html)

