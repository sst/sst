The `NextjsSite` construct is a higher level CDK construct that makes it easy to create a Next.js app. It provides a simple way to build and deploy the site to an S3 bucket; setup a CloudFront CDN for fast content delivery; and configure a custom domain for the website URL.

It also allows you to [automatically set the environment variables](#configuring-environment-variables) in your Next.js app directly from the outputs in your SST app.

## Next.js Features
The `NextjsSite` construct uses the [`@sls-next/lambda-at-edge`](https://github.com/serverless-nextjs/serverless-next.js/tree/master/packages/libs/lambda-at-edge) package from the [`serverless-next.js`](https://github.com/serverless-nextjs/serverless-next.js) project to build and package your Next.js app so that it can be deployed to Lambda@Edge and CloudFront.

:::note

To use the `NextjsSite` construct, you have to install `@sls-next/lambda-at-edge` as a dependency in your `package.json`.

```bash
npm install --save @sls-next/lambda-at-edge
```
:::

Most of the Next.js 11 features are supported, including:

- [Static Site Generation (SSG)](https://nextjs.org/docs/basic-features/data-fetching#getstaticprops-static-generation): Static pages are served out through the CloudFront CDN.
- [Server Side Rendering (SSR)](https://nextjs.org/docs/basic-features/data-fetching#getserversideprops-server-side-rendering): Server side rendering is performed at CloudFront edge locations using Lambda@Edge.
- [API Routes](https://nextjs.org/docs/api-routes/introduction): API requests are served from CloudFront edge locations using Lambda@Edge.
- [Incremental Static Regeneration (ISR)](https://nextjs.org/docs/basic-features/data-fetching#incremental-static-regeneration): Regeneration is performed using Lambda functions, and the generated pages will be served out through the CloudFront CDN.
- [Image Optimization](https://nextjs.org/docs/basic-features/image-optimization): Images are resized and optimized at CloudFront edge locations using Lambda@Edge.

Next.js 12 features like middleware and AVIF image are not yet supported. You can [read more about the features supported by `serverless-next.js`](https://github.com/serverless-nextjs/serverless-next.js#features). And you can [follow the progress on Next.js 12 support here](https://github.com/serverless-nextjs/serverless-next.js/issues/2016).

## Examples

### Creating a Next.js app

Deploys a Next.js app in the `path/to/site` directory.

```js
new NextjsSite(stack, "NextSite", {
  path: "path/to/site",
});
```

### Environment variables

The `NextjsSite` construct allows you to set the environment variables in your Next.js app based on outputs from other constructs in your SST app. So you don't have to hard code the config from your backend. Let's look at how.

Next.js supports [setting build time environment variables](https://nextjs.org/docs/basic-features/environment-variables). In your JS files this looks like:


```js title="pages/index.js"
console.log(process.env.API_URL);
console.log(process.env.USER_POOL_CLIENT);
```

You can pass these in directly from the construct.

```js {3-6}
new NextjsSite(stack, "NextSite", {
  path: "path/to/site",
  environment: {
    API_URL: api.url,
    USER_POOL_CLIENT: auth.cognitoUserPoolClient.userPoolClientId,
  },
});
```

Where `api.url` or `auth.cognitoUserPoolClient.userPoolClientId` are coming from other constructs in your SST app.

#### While deploying

On `sst deploy`, the environment variables will first be replaced by placeholder values, `{{ API_URL }}` and `{{ USER_POOL_CLIENT }}`, when building the Next.js app. And after the referenced resources have been created, the Api and User Pool in this case, the placeholders in the HTML and JS files will then be replaced with the actual values.

:::caution
Since the actual values are determined at deploy time, you should not rely on the values at build time. For example, you cannot fetch from `process.env.API_URL` inside `getStaticProps()` at build time.

There are a couple of work arounds:
- Hardcode the API URL
- Read the API URL dynamically at build time (ie. from an SSM value)
- Use [fallback pages](https://nextjs.org/docs/basic-features/data-fetching#fallback-pages) to generate the page on the fly
:::

#### While developing

To use these values while developing, run `sst start` to start the [Live Lambda Development](/live-lambda-development.md) environment.

``` bash
npx sst start
```

Then in your Next.js app to reference these variables, add the [`sst-env`](/packages/static-site-env.md) package.

```bash
npm install --save-dev @serverless-stack/static-site-env
```

And tweak the Next.js `dev` script to:

```json title="package.json" {2}
"scripts": {
  "dev": "sst-env -- next dev",
  "build": "next build",
  "start": "next start"
},
```

Now you can start your Next.js app as usual and it'll have the environment variables from your SST app.

``` bash
npm run dev
```

There are a couple of things happening behind the scenes here:

1. The `sst start` command generates a file with the values specified by the `NextjsSite` construct's `environment` prop.
2. The `sst-env` CLI will traverse up the directories to look for the root of your SST app.
3. It'll then find the file that's generated in step 1.
4. It'll load these as environment variables before running the start command.

:::note
`sst-env` only works if the Next.js app is located inside the SST app or inside one of its subdirectories. For example:

```
/
  sst.json
  nextjs-app/
```
:::

### Custom domains

You can configure the website with a custom domain hosted either on [Route 53](https://aws.amazon.com/route53/) or [externally](#configuring-externally-hosted-domain).

#### Using the basic config (Route 53 domains)

```js {3}
new NextjsSite(stack, "Site", {
  path: "path/to/site",
  customDomain: "domain.com",
});
```

#### Redirect www to non-www (Route 53 domains)

```js {3-6}
new NextjsSite(stack, "Site", {
  path: "path/to/site",
  customDomain: {
    domainName: "domain.com",
    domainAlias: "www.domain.com",
  },
});
```

#### Configuring domains across stages (Route 53 domains)

```js {3-7}
new NextjsSite(stack, "Site", {
  path: "path/to/site",
  customDomain: {
    domainName:
      scope.stage === "prod" ? "domain.com" : `${scope.stage}.domain.com`,
    domainAlias: scope.stage === "prod" ? "www.domain.com" : undefined,
  },
});
```

#### Using the full config (Route 53 domains)

```js {3-7}
new NextjsSite(stack, "Site", {
  path: "path/to/site",
  customDomain: {
    domainName: "domain.com",
    domainAlias: "www.domain.com",
    hostedZone: "domain.com",
  },
});
```

#### Importing an existing certificate (Route 53 domains)

```js {8}
import { Certificate } from "aws-cdk-lib/aws-certificatemanager";

new NextjsSite(stack, "Site", {
  path: "path/to/site",
  customDomain: {
    domainName: "domain.com",
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
  path: "path/to/site",
  customDomain: {
    domainName: "domain.com",
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
  path: "path/to/site",
  cutomDomain: {
    isExternalDomain: true,
    domainName: "domain.com",
    cdk: {
      certificate: Certificate.fromCertificateArn(stack, "MyCert", certArn),
    },
  },
});
```

Note that the certificate needs be created in the `us-east-1`(N. Virginia) region as required by AWS CloudFront, and validated. After the `Distribution` has been created, create a CNAME DNS record for your domain name with the `Distribution's` URL as the value. Here are more details on [configuring SSL Certificate on externally hosted domains](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/CNAMEs.html).

Also note that you can also migrate externally hosted domains to Route 53 by [following this guide](https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/MigratingDNS.html).

### Configuring the Lambda Functions

Configure the internally created CDK [`Lambda Function`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_lambda.Function.html) instance.

```js {4-8}
new NextjsSite(stack, "Site", {
  path: "path/to/site",
  defaults: {
    function: {
      timeout: 20,
      memorySize: 2048,
      permissions: ["sns"],
    }
  },
});
```

### Permissions

You can attach a set of [permissions](Permissions.md) to allow the Next.js API routes and Server Side rendering `getServerSideProps` to access other AWS resources.

```js {5}
const site = new NextjsSite(stack, "Site", {
  path: "path/to/site",
});

site.attachPermissions(["sns"]);
```

### Advanced examples

#### Using an existing S3 Bucket

```js {5-7}
import * as s3 from "aws-cdk-lib/aws-s3";

new NextjsSite(stack, "Site", {
  path: "path/to/site",
  cdk: {
    bucket: s3.Bucket.fromBucketName(stack, "Bucket", "my-bucket"),
  },
});
```

#### Configuring Lambda Functions

Configure the internally created CDK [`Lambda Function`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_lambda.Function.html) instance.

```js {4-8}
new NextjsSite(stack, "Site", {
  path: "path/to/site",
  defaults: {
    function: {
      timeout: 20,
      memorySize: 2048,
      permissions: ["sns"],
    },
  },
});
```

#### Reusing CloudFront cache policies

CloudFront has a limit of 20 cache policies per AWS account. This is a hard limit, and cannot be increased. Each `NextjsSite` creates 3 cache policies. If you plan to deploy multiple Next.js sites, you can have the constructs share the same cache policies by reusing them across sites.

```js
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";

const cachePolicies = {
  staticCachePolicy: new cloudfront.CachePolicy(stack, "StaticCache", NextjsSite.staticCachePolicyProps),
  imageCachePolicy: new cloudfront.CachePolicy(stack, "ImageCache", NextjsSite.imageCachePolicyProps),
  lambdaCachePolicy: new cloudfront.CachePolicy(stack, "LambdaCache", NextjsSite.lambdaCachePolicyProps),
};

new NextjsSite(stack, "Site1", {
  path: "path/to/site1",
  cdk: {
    cachePolicies,
  }
});

new NextjsSite(stack, "Site2", {
  path: "path/to/site2",
  cdk: {
    cachePolicies,
  }
});
```

#### Reusing CloudFront image origin request policy

CloudFront has a limit of 20 origin request policies per AWS account. This is a hard limit, and cannot be increased. Each `NextjsSite` creates a new origin request policy by default. If you plan to deploy multiple Next.js sites, you can have the constructs share the same origin request policy by reusing them across sites.

```js
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";

const imageOriginRequestPolicy = new cloudfront.OriginRequestPolicy(stack, "ImageOriginRequest", NextjsSite.imageOriginRequestPolicyProps);

new NextjsSite(stack, "Site1", {
  path: "path/to/site1",
  cdk: {
    imageOriginRequestPolicy,
  }
});

new NextjsSite(stack, "Site2", {
  path: "path/to/site2",
  cdk: {
    imageOriginRequestPolicy,
  }
});
```