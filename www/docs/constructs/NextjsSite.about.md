The `NextjsSite` construct is a higher level CDK construct that makes it easy to create a Next.js app. It uses the [OpenNext](https://github.com/serverless-stack/open-next) project to build your Next.js app, and transforms the build output to a format that can be deployed to AWS. The OpenNext project is maintained by the SST team🧡.

The `NextjsSite` construct provides a simple way to build and deploy the app to AWS:

- The client assets are deployed to an S3 Bucket, and served out from a CloudFront CDN for fast content delivery.
- The app server and API functions are deployed to Lambda. You can deploy to Lambda@Edge instead if the `edge` flag is enabled. Read more about [Single region vs Edge](#single-region-vs-edge).
- It enables you to [configure custom domains](#custom-domains) for the website URL.
- It also enable you to [automatically set the environment variables](#environment-variables) for your Next.js app directly from the outputs in your SST app.
- It provides a simple interface to [grant permissions](#using-aws-services) for your app to access AWS resources.

## Quick Start

1. If you are creating a new Next.js app, run `create-next-app` from the root of your SST app.

   ```bash
   npx create-next-app@latest
   ```

   ![Create Next.js App template](/img/nextjs/bootstrap-nextjs.png)

   After the Next.js app is created, your SST app structure should look like:

   ```bash
   my-sst-app
   ├─ sst.config.ts
   ├─ services
   ├─ stacks
   └─ my-next-app     <-- new Next.js app
      ├─ pages
      ├─ public
      ├─ styles
      └─ next.config.js
   ```

   Continue to step 3.

2. Alternatively, if you have an existing Next.js app, move the app to the root of your SST app. Your SST app structure should look like:

   ```bash
   my-sst-app
   ├─ sst.config.ts
   ├─ services
   ├─ stacks
   └─ my-next-app     <-- your Next.js app
      ├─ pages
      ├─ public
      ├─ styles
      └─ next.config.js
   ```

3. Also add the `sst bind` command to your Next.js app's `package.json`. `sst bind` enables you to [automatically set the environment variables](#environment-variables) for your Next.js app directly from the outputs in your SST app.

   ```diff
     "scripts": {
   -   "dev": "next dev",
   +   "dev": "sst bind next dev",
       "build": "next build",
       "start": "next start",
       "lint": "next lint"
     },
   ```

4. Add the `NextjsSite` construct to an existing stack in your SST app. You can also create a new stack for the app.

   ```ts
   import { NextjsSite, StackContext } as sst from "sst/constructs";

   export default function MyStack({ stack }: StackContext) {

     // ... existing constructs

     // Create the Next.js site
     const site = new NextjsSite(stack, "Site", {
       path: "my-next-app/",
     });

     // Add the site's URL to stack output
     stack.addOutputs({
       URL: site.url,
     });
   }
   ```

   When you are building your SST app, `NextjsSite` will invoke `npx open-next@latest build` inside the Next.js app directory. Make sure `path` is pointing to the your Next.js app.

   We also added the site's URL to the stack output. After the deploy succeeds, the URL will be printed out in the terminal.

   Note that during development, the site is not deployed. You should run the site locally. In this case, `site.url` is `undefined`. [Read more about how environment variables work during development](#while-developing).

## Working locally

To work on your Next.js app locally with SST:

1. Start SST in your project root.

   ```bash
   npx sst dev
   ```

2. Then start your Next.js app. This should run `sst bind next dev`.

   ```bash
   npm run dev
   ```

:::note
When running `sst dev`, SST does not deploy your Next.js app. It's meant to be run locally.
:::

## Single region vs edge

There are two ways you can deploy the Next.js app to your AWS account.

By default, the Next.js app server is deployed to a single region defined in your `sst.config.ts` or passed in via the `--region` flag. Alternatively, you can choose to deploy to the edge. When deployed to the edge, middleware, SSR functions, and API routes are running on edge location that is physically closer to the end user. In this case, the app server is deployed to AWS Lambda@Edge.

You can enable edge like this:

```ts
const site = new NextjsSite(stack, "Site", {
  path: "my-next-app/",
  edge: true,
});
```

Note that, in the case you have a centralized database, Edge locations are often far away from your database. If you are quering your database in your SSR functions and API routes, you might experience much longer latency when deployed to the edge.

:::info
We recommend you to deploy to a single region when unsure.
:::

## Custom domains

You can configure the website with a custom domain hosted either on [Route 53](https://aws.amazon.com/route53/) or [externally](#configuring-externally-hosted-domain).

```js {5}
const site = new NextjsSite(stack, "Site", {
  path: "my-next-app/",
  customDomain: "my-app.com",
});
```

Note that visitors to the `http://` URL will be redirected to the `https://` URL.

You can also configure an alias domain to point to the main domain. For example, to setup `www.my-app.com` redirecting to `my-app.com`:

```js {5}
const site = new NextjsSite(stack, "Site", {
  path: "my-next-app/",
  customDomain: {
    domainName: "my-app.com",
    domainAlias: "www.my-app.com",
  },
});
```

## Environment variables

The `NextjsSite` construct allows you to set the environment variables in your Next.js app based on outputs from other constructs in your SST app. So you don't have to hard code the config from your backend. Let's look at how.

To expose environment variables to your Next.js application you should utilise the `NextjsSite` construct `environment` configuration property rather than an `.env` file within your Next.js application root.

Imagine you have an S3 bucket created using the [`Bucket`](../constructs/Bucket.md) construct, and you want to upload files to the bucket. You'd pass the bucket's name to your Next.js app.

```ts {7-9}
const bucket = new Bucket(stack, "Bucket", {
  // ...
});

new NextjsSite(stack, "Site", {
  path: "my-next-app/",
  environment: {
    BUCKET_NAME: bucket.bucketName,
  },
});
```

Then you can access the bucket's name in your server code:

```ts
console.log(process.env.BUCKET_NAME);
```

Note that, in Next.js, only environment variables prefixed with `NEXT_PUBLIC_` are available in your browser code. [Read more about using environment variables](https://nextjs.org/docs/basic-features/environment-variables#exposing-environment-variables-to-the-browser).

For example, if you want to access the bucket's name in your frontend js code, you'd name it `NEXT_PUBLIC_BUCKET_NAME`:

```js
new NextjsSite(stack, "Site", {
  path: "my-next-app/",
  environment: {
    NEXT_PUBLIC_BUCKET_NAME: bucket.bucketName,
  },
});
```

Let's take look at what is happening behind the scene.

#### While deploying

On `sst deploy`, the Next.js server function is deployed to a Lambda function, and the NextjsSite's `environment` values are set as Lambda function environment variables. In this case, `process.env.BUCKET_NAME` will be available at runtime.

If environment variables are referenced in the browser code, they will first be replaced by placeholder values, ie. `{{ NEXT_PUBLIC_BUCKET_NAME }}`, when building the Next.js app. And after the S3 bucket has been created, the placeholders in the HTML and JS files will then be replaced with the actual values.

:::caution
Since the actual values are determined at deploy time, you should not rely on the values at build time. For example, you cannot reference `process.env.BUCKET_NAME` inside `getStaticProps()` at build time.

There are a couple of work arounds:

- Hardcode the bucket name
- Read the bucket name dynamically at build time (ie. from an SSM value)
- Use [fallback pages](https://nextjs.org/docs/basic-features/data-fetching#fallback-pages) to generate the page on the fly

:::

#### While developing

To use these values while developing, run `sst dev` to start the [Live Lambda Development](/live-lambda-development.md) environment.

```bash
npx sst dev
```

Then in your Next.js app to reference these variables, add the [`sst bind`](../packages/sst.md#sst-bind) command.

```json title="package.json" {2}
"scripts": {
  "dev": "sst bind next dev",
  "build": "next build",
  "start": "next start"
},
```

Now you can start your Next.js app as usual and it'll have the environment variables from your SST app.

```bash
npm run dev
```

There are a couple of things happening behind the scenes here:

1. The `sst dev` command generates a file with the values specified by the `NextjsSite` construct's `environment` prop.
2. The `sst bind` CLI will traverse up the directories to look for the root of your SST app.
3. It'll then find the file that's generated in step 1.
4. It'll load these as environment variables before running the start command.

:::note
`sst bind` only works if the Next.js app is located inside the SST app or inside one of its subdirectories. For example:

```
/
  sst.config.ts
  my-next-app/
```

:::

## Using AWS services

Since the `NextjsSite` construct deploys your Next.js app to your AWS account, it's very convenient to access other resources in your AWS account. `NextjsSite` provides a simple way to grant [permissions](Permissions.md) to access specific AWS resources.

Imagine you have an S3 bucket created using the [`Bucket`](../constructs/Bucket.md) construct, and you want to upload files to the bucket.

```ts {12}
const bucket = new Bucket(stack, "Bucket", {
  // ...
});

const site = new NextjsSite(stack, "Site", {
  path: "my-next-app/",
  environment: {
    BUCKET_NAME: bucket.bucketName,
  },
});

site.attachPermissions([bucket]);
```

Note that we are also passing the bucket name into the environment, so the Next.js server code can fetch the value `process.env.BUCKET_NAME` when calling the AWS S3 SDK API to upload a file.

## Examples

### Configuring custom domains

You can configure the website with a custom domain hosted either on [Route 53](https://aws.amazon.com/route53/) or [externally](#configuring-externally-hosted-domain).

#### Using the basic config (Route 53 domains)

```js {3}
new NextjsSite(stack, "Site", {
  path: "my-next-app/",
  customDomain: "my-app.com",
});
```

#### Redirect www to non-www (Route 53 domains)

```js {3-6}
new NextjsSite(stack, "Site", {
  path: "my-next-app/",
  customDomain: {
    domainName: "my-app.com",
    domainAlias: "www.my-app.com",
  },
});
```

#### Configuring domains across stages (Route 53 domains)

```js {3-7}
new NextjsSite(stack, "Site", {
  path: "my-next-app/",
  customDomain: {
    domainName:
      scope.stage === "prod" ? "my-app.com" : `${scope.stage}.my-app.com`,
    domainAlias: scope.stage === "prod" ? "www.my-app.com" : undefined,
  },
});
```

#### Configuring alternate domain names (Route 53 domains)

You can specify additional domain names for the site url. Note that the certificate for these names will not be automatically generated, so the certificate option must be specified. Also note that you need to manually create the Route 53 records for the alternate domain names.

```js
import * as acm from "aws-cdk-lib/aws-certificatemanager";
import * as route53 from "aws-cdk-lib/aws-route53";
import * as route53Targets from "aws-cdk-lib/aws-route53-targets";

// Look up hosted zone
const hostedZone = route53.HostedZone.fromLookup(stack, "HostedZone", {
  domainName: "my-app.com",
});

// Create a certificate with alternate domain names
const certificate = new acm.DnsValidatedCertificate(stack, "Certificate", {
  domainName: "foo.my-app.com",
  hostedZone,
  region: "us-east-1",
  subjectAlternativeNames: ["bar.my-app.com"],
});

// Create site
const site = new NextjsSite(stack, "Site", {
  path: "my-next-app/",
  customDomain: {
    domainName: "foo.my-app.com",
    alternateNames: ["bar.my-app.com"],
    cdk: {
      hostedZone,
      certificate,
    },
  },
});

// Create A and AAAA records for the alternate domain names
const recordProps = {
  recordName: "bar.my-app.com",
  zone: hostedZone,
  target: route53.RecordTarget.fromAlias(
    new route53Targets.CloudFrontTarget(site.cdk.distribution)
  ),
};
new route53.ARecord(stack, "AlternateARecord", recordProps);
new route53.AaaaRecord(stack, "AlternateAAAARecord", recordProps);
```

#### Importing an existing certificate (Route 53 domains)

```js {8}
import { Certificate } from "aws-cdk-lib/aws-certificatemanager";

new NextjsSite(stack, "Site", {
  path: "my-next-app/",
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

new NextjsSite(stack, "Site", {
  path: "my-next-app/",
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

new NextjsSite(stack, "Site", {
  path: "my-next-app/",
  customDomain: {
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

### Configuring server function

```js {3-4}
new NextjsSite(stack, "Site", {
  path: "my-next-app/",
  timeout: "5 seconds",
  memorySize: "2048 MB",
});
```

### Configuring image optimization function

```js {3-5}
new NextjsSite(stack, "Site", {
  path: "my-next-app/",
  imageOptimization: {
    memorySize: "2048 MB",
  },
});
```

### Advanced examples

#### Configuring VPC

Note that VPC is only supported when deploying to a [single region](#single-region-vs-edge).

```js {12-17}
import { Vpc, SubnetType } as ec2 from "aws-cdk-lib/aws-ec2";

// Create a VPC
const vpc = new Vpc(stack, "myVPC");

// Alternatively use an existing VPC
const vpc = Vpc.fromLookup(stack, "myVPC", { ... });

new NextjsSite(stack, "Site", {
  path: "my-next-app/",
  cdk: {
    server: {
      vpc,
      vpcSubnets: {
        subnetType: SubnetType.PRIVATE_WITH_NAT,
      }
    }
  }
});
```

#### Using an existing S3 Bucket

```js {6}
import * as s3 from "aws-cdk-lib/aws-s3";

new NextjsSite(stack, "Site", {
  path: "my-next-app/",
  cdk: {
    bucket: s3.Bucket.fromBucketName(stack, "Bucket", "my-bucket"),
  },
});
```

#### Reusing CloudFront cache policies

CloudFront has a limit of 20 cache policies per AWS account. This is a hard limit, and cannot be increased. If you plan to deploy multiple Next.js sites, you can have the constructs share the same cache policies by reusing them across sites.

```js
import * as cdk from "aws-cdk-lib";
import * as cf from "aws-cdk-lib/aws-cloudfront";

const serverCachePolicy = new cf.CachePolicy(stack, "ServerCache", {
  queryStringBehavior: cf.CacheQueryStringBehavior.all(),
  headerBehavior: cf.CacheHeaderBehavior.none(),
  cookieBehavior: cf.CacheCookieBehavior.all(),
  defaultTtl: cdk.Duration.days(0),
  maxTtl: cdk.Duration.days(365),
  minTtl: cdk.Duration.days(0),
  enableAcceptEncodingBrotli: true,
  enableAcceptEncodingGzip: true,
});

new NextjsSite(stack, "Site1", {
  path: "my-next-app/",
  cdk: {
    serverCachePolicy,
  },
});

new NextjsSite(stack, "Site2", {
  path: "another-next-app/",
  cdk: {
    serverCachePolicy,
  },
});
```
