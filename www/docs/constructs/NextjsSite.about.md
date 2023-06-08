The `NextjsSite` construct is a higher level CDK construct that lets you create Next.js apps on AWS. It uses [OpenNext](https://open-next.js.org) to build your Next.js app, and transforms the build output to a format that can be deployed to AWS.

Here's how it works at a high level.

- The client assets are deployed to an S3 Bucket, and served out from a CloudFront CDN for fast content delivery.
- The app server and API functions are deployed to Lambda. You can deploy to Lambda@Edge instead if the `edge` flag is enabled. Read more about [Single region vs Edge](#single-region-vs-edge).
- You can [reference other AWS resources](#using-aws-services) directly in your Next.js app.
- You can [configure custom domains](#custom-domains).

---

## Quick Start

1. You can use SST in an existing Next.js app in _drop-in mode_ or inside a monorepo app in _standalone mode_.

   - If you have an existing Next.js app, just run `npx create-sst` at the root and it'll configure SST in [_drop-in mode_](../what-is-sst.md#drop-in-mode).

     ```bash
     npx create-sst@latest
     ```

   - If you are starting from scratch, we recommend using our monorepo starter in [_standalone mode_](../what-is-sst.md#standalone-mode).

     ```bash
     npx create-sst@latest --template standard/nextjs
     ```

2. This adds the `NextjsSite` construct to your stacks code.

   ```ts {8-10}
   import { NextjsSite, StackContext } as sst from "sst/constructs";

   export default function MyStack({ stack }: StackContext) {

     // ... existing constructs

     // Create the Next.js site
     const site = new NextjsSite(stack, "Site", {
       path: "packages/web",
     });

     // Add the site's URL to stack output
     stack.addOutputs({
       URL: site.url,
     });
   }
   ```

   When you are building your SST app, `NextjsSite` will invoke `npx open-next@latest build` inside the Next.js app directory. We also print out the `site.url` once deployed.

3. We also use the [`sst bind`](../packages/sst.md#sst-bind) command in your Next.js app's `package.json` to run `next dev`. This allows you to [bind your AWS resources](#using-aws-services) directly to your Next.js app.

   ```diff {3}
     "scripts": {
   -   "dev": "next dev",
   +   "dev": "sst bind next dev",
       "build": "next build",
     },
   ```

Check out the [full Next.js tutorial](../start/nextjs.md).

---

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

---

## Single region vs edge

There are two ways you can deploy a Next.js app to your AWS account.

- Single region

  By default, the Next.js app server is deployed to a single region defined in your [`sst.config.ts`](../configuring-sst.md#config-function) or passed in via the [`--region`](packages/sst.md#global-options) flag.

- Edge

  Alternatively, you can choose to deploy to the edge. When deployed to the edge, middleware, SSR functions, and API routes are running on edge location that is physically closer to the end user. In this case, the app server is deployed to AWS Lambda@Edge.

  ```ts {3}
  const site = new NextjsSite(stack, "Site", {
    path: "my-next-app/",
    edge: true,
  });
  ```

Note that, if you have a centralized database, Edge locations are often far away from your database. If you are querying your database in your SSR functions and API routes, you might experience much longer latency when deployed to the edge.

:::info
If you are not sure which one to use, we recommend deploying to a single region.
:::

---

## Custom domains

You can configure the app with a custom domain hosted either on [Route 53](https://aws.amazon.com/route53/) or [externally](#configuring-externally-hosted-domain).

```js {3}
const site = new NextjsSite(stack, "Site", {
  path: "my-next-app/",
  customDomain: "my-app.com",
});
```

Note that visitors to `http://` will be redirected to `https://`.

You can also configure an alias domain to point to the main domain. For example, to setup `www.my-app.com` to redirect to `my-app.com`:

```js {5}
const site = new NextjsSite(stack, "Site", {
  path: "my-next-app/",
  customDomain: {
    domainName: "my-app.com",
    domainAlias: "www.my-app.com",
  },
});
```

---

## Using AWS services

SST makes it very easy for your `NextjsSite` construct to access other resources in your AWS account. Imagine you have an S3 bucket created using the [`Bucket`](../constructs/Bucket.md) construct. You can bind it to your Next.js app.

```ts {5}
const bucket = new Bucket(stack, "Uploads");

const site = new NextjsSite(stack, "Site", {
  path: "packages/web",
  bind: [bucket],
});
```

This will attach the necessary IAM permissions and allow your Next.js app to access the bucket through the typesafe [`sst/node`](../clients/index.md) client.

```ts {4}
import { Bucket } from "sst/node/bucket";

export async function getServerSideProps() {
  console.log(Bucket.Uploads.bucketName);
}
```

You can read more about this over on the [Resource Binding](../resource-binding.md) doc.

---

## Warming

Server functions may experience performance issues due to Lambda cold starts. SST helps mitigate this by periodically invoking the server function.

```ts {5}
new NextjsSite(stack, "Site", {
  path: "packages/web",
  warm: 20,
});
```

Setting `warm` to 20 keeps 20 server function instances active, invoking them every 5 minutes.

Note that warming is currently supported only in regional mode.

[Read more about how warming works and the associated cost.](https://github.com/serverless-stack/open-next#warmer-function)

---

#### Client side environment variables

You can also pass in environment variables directly to your client side code.

```ts {5-7}
const bucket = new Bucket(stack, "Bucket");

new NextjsSite(stack, "Site", {
  path: "packages/web",
  environment: {
    NEXT_PUBLIC_BUCKET_NAME: bucket.bucketName,
  },
});
```

Now you can access the bucket's name in your client side code.

```ts
console.log(process.env.NEXT_PUBLIC_BUCKET_NAME);
```

In Next.js, only environment variables prefixed with `NEXT_PUBLIC_` are available in your client side code. Read more about using environment variables over on the [Next.js docs](https://nextjs.org/docs/basic-features/environment-variables#exposing-environment-variables-to-the-browser).

You can also [read about how this works](../resource-binding.md#client-side-environment-variables) behind the scenes in SST.

---

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
      stack.stage === "prod" ? "my-app.com" : `${stack.stage}.my-app.com`,
    domainAlias: stack.stage === "prod" ? "www.my-app.com" : undefined,
  },
});
```

#### Configuring alternate domain names (Route 53 domains)

You can specify additional domain names for the site url. Note that the certificate for these names will not be automatically generated, so the certificate option must be specified. Also note that you need to manually create the Route 53 records for the alternate domain names.

```js
import { DnsValidatedCertificate } from "aws-cdk-lib/aws-certificatemanager";
import { HostedZone, RecordTarget, ARecord, AaaaRecord } from "aws-cdk-lib/aws-route53";
import { CloudFrontTarget } from "aws-cdk-lib/aws-route53-targets";

// Look up hosted zone
const hostedZone = HostedZone.fromLookup(stack, "HostedZone", {
  domainName: "my-app.com",
});

// Create a certificate with alternate domain names
const certificate = new DnsValidatedCertificate(stack, "Certificate", {
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
  target: RecordTarget.fromAlias(
    new CloudFrontTarget(site.cdk.distribution)
  ),
};
new ARecord(stack, "AlternateARecord", recordProps);
new AaaaRecord(stack, "AlternateAAAARecord", recordProps);
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
import { Vpc, SubnetType } from "aws-cdk-lib/aws-ec2";

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

#### Configuring log retention

```js {6-8}
import { RetentionDays } from "aws-cdk-lib/aws-logs";

new NextjsSite(stack, "Site", {
  path: "my-next-app/",
  cdk: {
    server: {
      logRetention: RetentionDays.ONE_MONTH,
    }
  },
});
```

#### Using an existing S3 Bucket

```js {6}
import { Bucket } from "aws-cdk-lib/aws-s3";

new NextjsSite(stack, "Site", {
  path: "my-next-app/",
  cdk: {
    bucket: Bucket.fromBucketName(stack, "Bucket", "my-bucket"),
  },
});
```

#### Reusing CloudFront cache policies

CloudFront has a limit of 20 cache policies per AWS account. This is a hard limit, and cannot be increased. If you plan to deploy multiple Next.js sites, you can have the constructs share the same cache policies by reusing them across sites.

```js
import { Duration } from "aws-cdk-lib";
import {
  CachePolicy,
  CacheQueryStringBehavior,
  CacheHeaderBehavior,
  CacheCookieBehavior,
} from "aws-cdk-lib/aws-cloudfront";

const serverCachePolicy = new CachePolicy(stack, "ServerCache", {
  queryStringBehavior: CacheQueryStringBehavior.all(),
  headerBehavior: CacheHeaderBehavior.none(),
  cookieBehavior: CacheCookieBehavior.all(),
  defaultTtl: Duration.days(0),
  maxTtl: Duration.days(365),
  minTtl: Duration.days(0),
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

#### Configuring CloudFront response headers policies

```js
import { ResponseHeadersPolicy } from "aws-cdk-lib/aws-cloudfront";

new NextjsSite(stack, "Site", {
  path: "my-next-app/",
  cdk: {
    responseHeadersPolicy: ResponseHeadersPolicy.CORS_ALLOW_ALL_ORIGINS,
  },
});
```
