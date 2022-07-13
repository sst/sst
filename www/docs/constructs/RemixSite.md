---
description: "Docs for the sst.RemixSite construct in the @serverless-stack/resources package"
---
<!--
!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
!!                                                           !!
!!  This file has been automatically generated, do not edit  !!
!!                                                           !!
!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
-->
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
const site = new RemixSite(this, "Site", {
  path: "my-remix-site/",
  customDomain: "my-app.com",
});
```

Note that visitors to the `http://` URL will be redirected to the `https://` URL.

You can also configure an alias domain to point to the main domain. For example, to setup `www.my-app.com` redirecting to `my-app.com`:

```js {5}
const site = new RemixSite(this, "Site", {
  path: "my-remix-site/",
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

new RemixSite(this, "Site", {
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

const site = new RemixSite(this, "Site", {
  path: "my-remix-app/",
  environment: {
    TABLE_NAME: table.tableName,
  },
});

site.attachPermissions([table]);
```

Note that we are also passing the table name into the environment, so the Remix loaders/actions can fetch the value `process.env.TABLE_NAME` when calling the DynamoDB API to query the table.

## Constructor
```ts
new RemixSite(scope, id, props)
```
_Parameters_
- __scope__ <span class="mono">[Construct](https://docs.aws.amazon.com/cdk/api/v2/docs/constructs.Construct.html)</span>
- __id__ <span class="mono">string</span>
- __props__ <span class="mono">[RemixSiteProps](#remixsiteprops)</span>

## Examples

### Using the minimal config

Deploys a Remix app in the `my-remix-app` directory.

```js
new RemixSite(stack, "web", {
  path: "my-remix-app/",
});
```


### Configuring custom domains

You can configure the website with a custom domain hosted either on [Route 53](https://aws.amazon.com/route53/) or [externally](#configuring-externally-hosted-domain).

#### Using the basic config (Route 53 domains)

```js {3}
new RemixSite(stack, "Site", {
  path: "my-remix-site/",
  customDomain: "my-app.com",
});
```

#### Redirect www to non-www (Route 53 domains)

```js {3-6}
new RemixSite(stack, "Site", {
  path: "my-remix-site/",
  customDomain: {
    domainName: "my-app.com",
    domainAlias: "www.my-app.com",
  },
});
```

#### Configuring domains across stages (Route 53 domains)

```js {3-7}
new RemixSite(stack, "Site", {
  path: "my-remix-site/",
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
  path: "my-remix-site/",
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
  path: "my-remix-site/",
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
  path: "my-remix-site/",
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
  path: "my-remix-site/",
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
  path: "my-remix-site/",
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
  path: "my-remix-site/",
  cdk: {
    cachePolicies,
  }
});

new RemixSite(stack, "Site2", {
  path: "another-remix-site/",
  cdk: {
    cachePolicies,
  }
});
```

## RemixSiteProps


### customDomain?

_Type_ : <span class='mono'><span class="mono">string</span> | <span class="mono">[RemixDomainProps](#remixdomainprops)</span></span>

The customDomain for this website. SST supports domains that are hosted
either on [Route 53](https://aws.amazon.com/route53/) or externally.
Note that you can also migrate externally hosted domains to Route 53 by
[following this guide](https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/MigratingDNS.html).


```js {3}
new RemixSite(stack, "RemixSite", {
  path: "path/to/site",
  customDomain: "domain.com",
});
```

```js {3-6}
new RemixSite(stack, "RemixSite", {
  path: "path/to/site",
  customDomain: {
    domainName: "domain.com",
    domainAlias: "www.domain.com",
    hostedZone: "domain.com"
  },
});
```



### defaults.function.memorySize?

_Type_ : <span class="mono">number</span>

### defaults.function.permissions?

_Type_ : <span class="mono">[Permissions](Permissions)</span>

### defaults.function.timeout?

_Type_ : <span class="mono">number</span>



### disablePlaceholder?

_Type_ : <span class="mono">boolean</span>

When running `sst start`, a placeholder site is deployed. This is to ensure
that the site content remains unchanged, and subsequent `sst start` can
start up quickly.


```js {3}
new RemixSite(stack, "RemixSite", {
  path: "path/to/site",
  disablePlaceholder: true,
});
```

### edge?

_Type_ : <span class="mono">boolean</span>

_Default_ : <span class="mono">false</span>

The Remix app server is deployed to a Lambda function behind an API Gateway
HTTP API. Alternatively, you can choose to deploy to Lambda@Edge.

### environment?

_Type_ : <span class="mono">Record&lt;<span class="mono">string</span>, <span class="mono">string</span>&gt;</span>

An object with the key being the environment variable name.


```js {3-6}
new RemixSite(stack, "RemixSite", {
  path: "path/to/site",
  environment: {
    API_URL: api.url,
    USER_POOL_CLIENT: auth.cognitoUserPoolClient.userPoolClientId,
  },
});
```

### path

_Type_ : <span class="mono">string</span>

Path to the directory where the website source is located.

### waitForInvalidation?

_Type_ : <span class="mono">boolean</span>

While deploying, SST waits for the CloudFront cache invalidation process to finish. This ensures that the new content will be served once the deploy command finishes. However, this process can sometimes take more than 5 mins. For non-prod environments it might make sense to pass in `false`. That'll skip waiting for the cache to invalidate and speed up the deploy process.


### cdk.bucket?

_Type_ : <span class="mono">[BucketProps](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_s3.BucketProps.html)</span>

Pass in bucket information to override the default settings this
construct uses to create the CDK Bucket internally.


### cdk.cachePolicies.buildCachePolicy?

_Type_ : <span class="mono">[ICachePolicy](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_cloudfront.ICachePolicy.html)</span>

Override the CloudFront cache policy properties for browser build files.

### cdk.cachePolicies.serverCachePolicy?

_Type_ : <span class="mono">[ICachePolicy](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_cloudfront.ICachePolicy.html)</span>

Override the CloudFront cache policy properties for responses from the
server rendering Lambda.

The default cache policy that is used in the abscene of this property
is one that performs no caching of the server response.

### cdk.cachePolicies.staticsCachePolicy?

_Type_ : <span class="mono">[ICachePolicy](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_cloudfront.ICachePolicy.html)</span>

Override the CloudFront cache policy properties for "public" folder
static files.
Note: This will not include the browser build files, which have a seperate
cache policy; @see `buildCachePolicy`.


Override the default CloudFront cache policies created internally.

### cdk.distribution?

_Type_ : <span class="mono">[RemixCdkDistributionProps](#remixcdkdistributionprops)</span>

Pass in a value to override the default settings this construct uses to
create the CDK `Distribution` internally.


## Properties
An instance of `RemixSite` has the following properties.
### bucketArn

_Type_ : <span class="mono">string</span>

The ARN of the internally created S3 Bucket.

### bucketName

_Type_ : <span class="mono">string</span>

The name of the internally created S3 Bucket.

### buildCachePolicyProps

_Type_ : <span class="mono">[CachePolicyProps](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_cloudfront.CachePolicyProps.html)</span>

The default CloudFront cache policy properties for browser build files.

### customDomainUrl

_Type_ : <span class='mono'><span class="mono">undefined</span> | <span class="mono">string</span></span>

If the custom domain is enabled, this is the URL of the website with the
custom domain.

### distributionDomain

_Type_ : <span class="mono">string</span>

The domain name of the internally created CloudFront Distribution.

### distributionId

_Type_ : <span class="mono">string</span>

The ID of the internally created CloudFront Distribution.

### serverCachePolicyProps

_Type_ : <span class="mono">[CachePolicyProps](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_cloudfront.CachePolicyProps.html)</span>

The default CloudFront cache policy properties for responses from the
server rendering Lambda.

By default no caching is performed on the server rendering Lambda response.

### staticsCachePolicyProps

_Type_ : <span class="mono">[CachePolicyProps](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_cloudfront.CachePolicyProps.html)</span>

The default CloudFront cache policy properties for "public" folder
static files.

This policy is not applied to the browser build files; they have a seperate
cache policy; @see `buildCachePolicyProps`.

### url

_Type_ : <span class="mono">string</span>

The CloudFront URL of the website.


### cdk.bucket

_Type_ : <span class="mono">[Bucket](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_s3.Bucket.html)</span>

The internally created CDK `Bucket` instance.

### cdk.certificate?

_Type_ : <span class="mono">[ICertificate](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_certificatemanager.ICertificate.html)</span>

The AWS Certificate Manager certificate for the custom domain.

### cdk.distribution

_Type_ : <span class="mono">[Distribution](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_cloudfront.Distribution.html)</span>

The internally created CDK `Distribution` instance.

### cdk.hostedZone?

_Type_ : <span class="mono">[IHostedZone](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_route53.IHostedZone.html)</span>

The Route 53 hosted zone for the custom domain.


Exposes CDK instances created within the construct.

## Methods
An instance of `RemixSite` has the following methods.
### attachPermissions

```ts
attachPermissions(permissions)
```
_Parameters_
- __permissions__ <span class="mono">[Permissions](Permissions)</span>


Attaches the given list of permissions to allow the Remix server side
rendering to access other AWS resources.


```js {5}
const site = new RemixSite(stack, "Site", {
  path: "path/to/site",
});

site.attachPermissions(["sns"]);
```

## RemixDomainProps


### alternateNames?

_Type_ : <span class='mono'>Array&lt;<span class="mono">string</span>&gt;</span>

_Default_ : <span class="mono">`[]`</span>

Specify additional names that should route to the Cloudfront Distribution. Note, certificates for these names will not be automatically generated so the `certificate` option must be specified.

### domainAlias?

_Type_ : <span class="mono">string</span>

_Default_ : <span class="mono">no alias configured</span>

An alternative domain to be assigned to the website URL. Visitors to the alias will be redirected to the main domain. (ie. `www.domain.com`).
Use this to create a `www.` version of your domain and redirect visitors to the root domain.
### domainName

_Type_ : <span class="mono">string</span>

The domain to be assigned to the website URL (ie. domain.com).
Supports domains that are hosted either on [Route 53](https://aws.amazon.com/route53/) or externally.

### hostedZone?

_Type_ : <span class="mono">string</span>

_Default_ : <span class="mono">same as the `domainName`</span>

The hosted zone in Route 53 that contains the domain. By default, SST will look for a hosted zone matching the domainName that's passed in.
Set this option if SST cannot find the hosted zone in Route 53.
### isExternalDomain?

_Type_ : <span class="mono">boolean</span>

_Default_ : <span class="mono">`false`</span>

Set this option if the domain is not hosted on Amazon Route 53.


### cdk.certificate?

_Type_ : <span class="mono">[ICertificate](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_certificatemanager.ICertificate.html)</span>

Import the certificate for the domain. By default, SST will create a certificate with the domain name. The certificate will be created in the `us-east-1`(N. Virginia) region as required by AWS CloudFront.
Set this option if you have an existing certificate in the `us-east-1` region in AWS Certificate Manager you want to use.

### cdk.hostedZone?

_Type_ : <span class="mono">[IHostedZone](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_route53.IHostedZone.html)</span>

Import the underlying Route 53 hosted zone.


## RemixCdkDistributionProps


### defaultBehavior?

_Type_ : <span class="mono">[AddBehaviorOptions](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_cloudfront.AddBehaviorOptions.html)</span>
