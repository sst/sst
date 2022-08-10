The `RemixSite` construct is a higher level CDK construct that makes it easy to create a Remix app. It provides a simple way to build and deploy the app to AWS:

  - The browser build and public static assets are deployed to an S3 Bucket, and served out from a CloudFront CDN for fast content delivery.
  - The app server is deployed to Lambda. You can deploy to Lambda@Edge instead if the `edge` flag is enabled. Read more about [Single region vs Edge](#single-region-vs-edge).
  - It enables you to [configure custom domains](#custom-domains) for the website URL.
  - It also enable you to [automatically set the environment variables](#environment-variables) for your Remix app directly from the outputs in your SST app.
  - It provides a simple interface to [grant permissions](#using-aws-services) for your app to access AWS resources.

## Quick Start

1. If you are creating a new Remix app, run `create-remix` from the root of your SST app.

  ```bash
  npx create-remix@latest
  ```
  
  And select `Remix App Server` as the deployment target.
  
  ![Selecte Remix App Server deployment target](/img/remix/bootstrap-remix.png)

  After the Remix app is created, your SST app structure should look like:

  ```bash
  my-sst-app
  ├─ sst.json
  ├─ services
  ├─ stacks
  └─ my-remix-app     <-- new Remix app
     ├─ app
     ├─ public
     └─ remix.config.js
  ```

  You can now jump to step 3 to complete the rest of the step.

2. If you have an existing Remix app, move the app to the root of your SST app. Your SST app structure should look like:

  ```bash
  my-sst-app
  ├─ sst.json
  ├─ services
  ├─ stacks
  └─ my-remix-app     <-- your Remix app
     ├─ app
     ├─ public
     └─ remix.config.js
  ```

  When you created your Remix app, you might've picked a different deployment target. We need to set the deploymen target to `Remix App Server`. To do that, make sure your `remix.config.js` contain the follow values.

  ```js
  module.exports = {
    // ...
    assetsBuildDirectory: "public/build",
    publicPath: "/build/",
    serverBuildPath: "build/index.js",
    serverBuildTarget: "node-cjs",
    server: undefined,
    // ...
  };
  ```

  :::info
  If you followed the `Developer Blog` or `Jokes App` tutorials on Remix's doc, it's likely you are using SQLite for database. SQLite databases cannot be deployed to a serverless environment. It is often used for local storage, and not recommended for modern web apps. It is recommended to use [PostgreSQL](../constructs/RDS.md), [DynamoDB](../constructs/Table.md), or one of third party services like MongoDB for your database.
  :::

3. Go into your Remix app, and add the `static-site-env` dependency to your Remix application's `package.json`. `static-site-env` enables you to [automatically set the environment variables](#environment-variables) for your Remix app directly from the outputs in your SST app.

  ```bash
  npm install --save-dev @serverless-stack/static-site-env
  ```

  Update the package.json scripts for your Remix application.

   ```diff
     "scripts": {
       "build": "remix build",
   -   "dev": "remix dev",
   +   "dev": "sst-env -- remix dev",
       "start": "remix-serve build"
     },
   ```

4. Add the `RemixSite` construct to an existing stack in your SST app. You can also create a new stack for the app.

  ```ts
  import * as sst from "@serverless-stack/resources";

  export default function MyStack({ stack }: sst.StackContext) {

    // ... existing constructs

    // Create the Remix site
    const site = new RemixSite(stack, "Site", {
      path: "my-remix-app/",
    });

    // Add the site's URL to stack output
    stack.addOutputs({
      URL: site.url,
    });
  }
  ```

  When you are building your SST app, `RemixSite` will invoke `npm build` inside the Remix app directory. Make sure `path` is pointing to the your Remix app.

  Note that we also added the site's URL to the stack output. After deploy succeeds, the URL will be printed out in the terminal.

## Single region vs edge
There are two ways you can deploy the Remix app to your AWS account.

By default, the Remix app server is deployed to a single region defined in your `sst.json` or passed in via the `--region` flag. Alternatively, you can choose to deploy to the edge. When deployed to the edge, loaders/actions are running on edge location that is physically closer to the end user. In this case, the app server is deployed to AWS Lambda@Edge.

You can enable edge like this:

```ts
const site = new RemixSite(stack, "Site", {
  path: "my-remix-app/",
  edge: true,
});
```

Note that, in the case you have a centralized database, Edge locations are often far away from your database. If you are quering your database in your loaders/actions, you might experience much longer latency when deployed to the edge.

:::info
We recommend you to deploy to a single region when unsure.
:::

## Custom domains

You can configure the website with a custom domain hosted either on [Route 53](https://aws.amazon.com/route53/) or [externally](#configuring-externally-hosted-domain).

```js {5}
const site = new RemixSite(stack, "Site", {
  path: "my-remix-app/",
  customDomain: "my-app.com",
});
```

Note that visitors to the `http://` URL will be redirected to the `https://` URL.

You can also configure an alias domain to point to the main domain. For example, to setup `www.my-app.com` redirecting to `my-app.com`:

```js {5}
const site = new RemixSite(stack, "Site", {
  path: "my-remix-app/",
  customDomain: {
    domainName: "my-app.com",
    domainAlias: "www.my-app.com",
  },
});
```

## Environment variables

The `RemixSite` construct allows you to set the environment variables in your Remix app based on outputs from other constructs in your SST app. So you don't have to hard code the config from your backend. Let's look at how.

To expose environment variables to your Remix application you should utilise the `RemixSite` construct `environment` configuration property rather than an `.env` file within your Remix application root.

Imagine you have an API created using the [`Api`](../constructs/Api.md) construct, and you want to fetch data from the API. You'd pass the API's endpoint to your Remix app.

```ts {7-9}
const api = new Api(stack, "Api", {
  // ...
});

new RemixSite(stack, "Site", {
  path: "path/to/site",
  environment: {
    API_URL: api.url,
  },
});
```

Then you can access the API's URL in your loaders/actions:

```ts
export async function loader() {
  console.log(process.env.API_URL);
}
```

:::info
Remix only supports [server environment variables](https://remix.run/docs/en/v1/guides/envvars#server-environment-variables). If you are looking to access environment variables in your browser code, follow the Remix guide on [browser environment variables](https://remix.run/docs/en/v1/guides/envvars#browser-environment-variables).

In our example, you'd return `ENV` for the client from the root loader.

```js title="app/routes/index.tsx"
export async function loader() {
  return json({
    ENV: {
      API_URL: process.env.API_URL,
    }
  });
}
```
:::

Let's take look at what is happening behind the scene.

#### While deploying

On `sst deploy`, the Remix app server is deployed to a Lambda function, and the RemixSite's `environment` values are set as Lambda function environment variables. In this case, `process.env.API_URL` will be available at runtime.

If you enabled the `edge` option, the Remix app server will instead get deployed to a Lambda@Edge function. We have an issue here, AWS Lambda@Edge does not support runtime environment variables. To get around this limitation, we insert a snippet to the top of your app server:

```ts
const environment = "{{ _SST_REMIX_SITE_ENVIRONMENT_ }}";
process.env = { ...process.env, ...environment };
```

And at deploy time, after the referenced resources have been created, the API in this case, a CloudFormation custom resource will update the app server's code and replace the placeholder `{{ _SST_REMIX_SITE_ENVIRONMENT_ }}` with the actual value:

```ts
const environment = { API_URL: "https://ioe7hbv67f.execute-api.us-east-1.amazonaws.com" };
process.env = { ...process.env, ...environment };
```

This will make `process.env.API_URL` available at runtime.

#### While developing

To use these values while developing, run `sst start` to start the [Live Lambda Development](/live-lambda-development.md) environment.

``` bash
npx sst start
```

Then in your Remix app to reference these variables, add the [`static-site-env`](/packages/static-site-env.md) package.

```bash
npm install --save-dev @serverless-stack/static-site-env
```

And tweak the Remix `dev` script to:

```json title="package.json" {2}
"scripts": {
  "build": "remix build",
  "dev": "sst-env -- remix dev",
  "start": "remix-serve build"
},
```

Now you can start your Remix app as usual and it'll have the environment variables from your SST app.

``` bash
npm run dev
```

There are a couple of things happening behind the scenes here:

1. The `sst start` command generates a file with the values specified by the `RemixSite` construct's `environment` prop.
2. The `sst-env` CLI will traverse up the directories to look for the root of your SST app.
3. It'll then find the file that's generated in step 1.
4. It'll load these as environment variables before running the start command.

:::note
`sst-env` only works if the Remix app is located inside the SST app or inside one of its subdirectories. For example:

```
/
  sst.json
  my-remix-app/
```
:::

## Using AWS services

Since the `RemixSite` construct deploys your Remix app to your AWS account, it's very convenient to access other resources in your AWS account in your Remix loaders/actions. `RemixSite` provides a simple way to grant [permissions](Permissions.md) to access specific AWS resources.

Imagine you have a DynamoDB table created using the [`Table`](../constructs/Table.md) construct, and you want to fetch data from the Table.

```ts {12}
const table = new Table(stack, "Table", {
  // ...
});

const site = new RemixSite(stack, "Site", {
  path: "my-remix-app/",
  environment: {
    TABLE_NAME: table.tableName,
  },
});

site.attachPermissions([table]);
```

Note that we are also passing the table name into the environment, so the Remix loaders/actions can fetch the value `process.env.TABLE_NAME` when calling the DynamoDB API to query the table.

## Examples

### Configuring custom domains

You can configure the website with a custom domain hosted either on [Route 53](https://aws.amazon.com/route53/) or [externally](#configuring-externally-hosted-domain).

#### Using the basic config (Route 53 domains)

```js {3}
new RemixSite(stack, "Site", {
  path: "my-remix-app/",
  customDomain: "my-app.com",
});
```

#### Redirect www to non-www (Route 53 domains)

```js {3-6}
new RemixSite(stack, "Site", {
  path: "my-remix-app/",
  customDomain: {
    domainName: "my-app.com",
    domainAlias: "www.my-app.com",
  },
});
```

#### Configuring domains across stages (Route 53 domains)

```js {3-7}
new RemixSite(stack, "Site", {
  path: "my-remix-app/",
  customDomain: {
    domainName:
      scope.stage === "prod" ? "my-app.com" : `${scope.stage}.my-app.com`,
    domainAlias: scope.stage === "prod" ? "www.my-app.com" : undefined,
  },
});
```

#### Using the full config (Route 53 domains)

```js {3-7}
new RemixSite(stack, "Site", {
  path: "my-remix-app/",
  customDomain: {
    domainName: "my-app.com",
    domainAlias: "www.my-app.com",
    hostedZone: "my-app.com",
  },
});
```

#### Importing an existing certificate (Route 53 domains)

```js {8}
import { Certificate } from "aws-cdk-lib/aws-certificatemanager";

new RemixSite(stack, "Site", {
  path: "my-remix-app/",
  customDomain: {
    domainName: "my-app.com",
    cdk: {
      certificate: Certificate.fromCertificateArn(stack, "MyCert", certArn),
    },
  },
});
```

Note that, the certificate needs be created in the `us-east-1`(N. Virginia) region as required by AWS CloudFront.

#### Specifying a hosted zone (Route 53 domains)

If you have multiple hosted zones for a given domain, you can choose the one you want to use to configure the domain.

```js {8-11}
import { HostedZone } from "aws-cdk-lib/aws-route53";

new RemixSite(stack, "Site", {
  path: "my-remix-app/",
  customDomain: {
    domainName: "my-app.com",
    cdk: {
      hostedZone: HostedZone.fromHostedZoneAttributes(stack, "MyZone", {
        hostedZoneId,
        zoneName,
      }),
    },
  },
});
```

#### Configuring externally hosted domain

```js {5-11}
import { Certificate } from "aws-cdk-lib/aws-certificatemanager";

new RemixSite(stack, "Site", {
  path: "my-remix-app/",
  cutomDomain: {
    isExternalDomain: true,
    domainName: "my-app.com",
    cdk: {
      certificate: Certificate.fromCertificateArn(stack, "MyCert", certArn),
    },
  },
});
```

Note that the certificate needs be created in the `us-east-1`(N. Virginia) region as required by AWS CloudFront, and validated. After the `Distribution` has been created, create a CNAME DNS record for your domain name with the `Distribution's` URL as the value. Here are more details on [configuring SSL Certificate on externally hosted domains](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/CNAMEs.html).

Also note that you can also migrate externally hosted domains to Route 53 by [following this guide](https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/MigratingDNS.html).

### Configuring the Lambda Function

Configure the internally created CDK [`Lambda Function`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_lambda.Function.html) instance.

```js {4-8}
new RemixSite(stack, "Site", {
  path: "my-remix-app/",
  defaults: {
    function: {
      timeout: 20,
      memorySize: 2048,
      permissions: ["sns"],
    }
  },
});
```

### Advanced examples

#### Using an existing S3 Bucket

```js {5-7}
import * as s3 from "aws-cdk-lib/aws-s3";

new RemixSite(stack, "Site", {
  path: "my-remix-app/",
  cdk: {
    bucket: s3.Bucket.fromBucketName(stack, "Bucket", "my-bucket"),
  },
});
```

#### Reusing CloudFront cache policies

CloudFront has a limit of 20 cache policies per AWS account. This is a hard limit, and cannot be increased. Each `RemixSite` creates 3 cache policies. If you plan to deploy multiple Remix sites, you can have the constructs share the same cache policies by reusing them across sites.

```js
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";

const cachePolicies = {
  browserBuildCachePolicy: new cloudfront.CachePolicy(stack, "BrowserBuildStaticsCache", RemixSite.browserBuildCachePolicyProps),
  publicCachePolicy: new cloudfront.CachePolicy(stack, "PublicStaticsCache", RemixSite.publicCachePolicyProps),
  serverResponseCachePolicy: new cloudfront.CachePolicy(stack, "ServerResponseCache", RemixSite.serverResponseCachePolicyProps),
};

new RemixSite(stack, "Site1", {
  path: "my-remix-app/",
  cdk: {
    cachePolicies,
  }
});

new RemixSite(stack, "Site2", {
  path: "another-remix-app/",
  cdk: {
    cachePolicies,
  }
});
```

#### Protecting server function behind API Gateway

When deployed to a single region, instead of sending the request to the server function directly, you can send the request to API Gateway and have API Gateway proxy the request to the server function. With this setup, you can use features like authorizers to protect the server function.

```js
import { Fn } from "aws-cdk-lib";
import * as origins from "aws-cdk-lib/aws-cloudfront-origins";

const api = new Api(stack, "Api");

const site = new RemixSite(stack, "Site", {
  path: "my-remix-app/",
  cdk: {
    distribution: {
      defaultBehavior: {
        origin: new origins.HttpOrigin(Fn.parseDomainName(api.url)),
      }
    }
  }
});

api.addRoutes(stack, {
  "GET /": {
    type: "function",
    cdk: {
      function: site.cdk.function
    },
  },
});
```