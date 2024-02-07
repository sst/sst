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
   ├─ sst.config.ts
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
   ├─ sst.config.ts
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
     ignoredRouteFiles: ["**/.*"],
     serverModuleFormat: "esm",
   };
   ```

   :::info
   If you followed the `Developer Blog` or `Jokes App` tutorials on Remix's doc, it's likely you are using SQLite for database. SQLite databases cannot be deployed to a serverless environment. It is often used for local storage, and not recommended for modern web apps. It is recommended to use [PostgreSQL](../constructs/RDS.md), [DynamoDB](../constructs/Table.md), or one of third party services like MongoDB for your database.
   :::

3. Go into your Remix app, and add the `sst bind` command to your Remix application's `package.json`. `sst bind` enables you to [automatically set the environment variables](#environment-variables) for your Remix app directly from the outputs in your SST app.

   Update the package.json scripts for your Remix application.

   ```diff
     "scripts": {
       "build": "remix build",
   -   "dev": "remix dev",
   +   "dev": "sst bind remix dev",
       "start": "remix-serve build"
     },
   ```

4. Add the `RemixSite` construct to an existing stack in your SST app. You can also create a new stack for the app.

   ```ts
   import { RemixSite, StackContext } from "sst/constructs";

   export default function MyStack({ stack }: StackContext) {

     // ... existing constructs

     // Create the Remix site
     const site = new RemixSite(stack, "Site", {
       path: "my-remix-app/",
     });

     // Add the site's URL to stack output
     stack.addOutputs({
       URL: site.url || "localhost",
     });
   }
   ```

   When you are building your SST app, `RemixSite` will invoke `npm build` inside the Remix app directory. Make sure `path` is pointing to the your Remix app.

   We also added the site's URL to the stack output. After the deploy succeeds, the URL will be printed out in the terminal.

## Working locally

To work on your Remix app locally with SST:

1. Start SST in your project root.

   ```bash
   npx sst dev
   ```

2. Then start your Remix app. This should run `sst bind remix dev`.

   ```bash
   npm run dev
   ```

:::note
When running `sst dev`, SST does not deploy your Remix app. It's meant to be run locally.
:::

## Single region vs edge

There are two ways you can deploy the Remix app to your AWS account.

By default, the Remix app server is deployed to a single region defined in your `sst.config.ts` or passed in via the `--region` flag. Alternatively, you can choose to deploy to the edge. When deployed to the edge, loaders/actions are running on edge location that is physically closer to the end user. In this case, the app server is deployed to AWS Lambda@Edge.

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
    },
  });
}
```

:::

Let's take look at what is happening behind the scene.

#### While deploying

On `sst deploy`, the Remix app server is deployed to a Lambda function, and the RemixSite's `environment` values are set as Lambda function environment variables. In this case, `process.env.API_URL` will be available at runtime.

If you enabled the `edge` option, the Remix app server will instead get deployed to a Lambda@Edge function. We have an issue here, AWS Lambda@Edge does not support runtime environment variables. To get around this limitation, we insert a snippet to the top of your app server:

```ts
const environment = "{{ _SST_FUNCTION_ENVIRONMENT_ }}";
process.env = { ...process.env, ...environment };
```

And at deploy time, after the referenced resources have been created, the API in this case, a CloudFormation custom resource will update the app server's code and replace the placeholder `{{ _SST_FUNCTION_ENVIRONMENT_ }}` with the actual value:

```ts
const environment = {
  API_URL: "https://ioe7hbv67f.execute-api.us-east-1.amazonaws.com",
};
process.env = { ...process.env, ...environment };
```

This will make `process.env.API_URL` available at runtime.

#### While developing

To use these values while developing, run `sst dev` to start the [Live Lambda Development](/live-lambda-development.md) environment.

```bash
npx sst dev
```

Then in your Remix app to reference these variables, add the [`sst bind`](../packages/sst.md#sst-env) command.

```json title="package.json" {2}
"scripts": {
  "build": "remix build",
  "dev": "sst bind remix dev",
  "start": "remix-serve build"
},
```

Now you can start your Remix app as usual and it'll have the environment variables from your SST app.

```bash
npm run dev
```

There are a couple of things happening behind the scenes here:

1. The `sst dev` command generates a file with the values specified by the `RemixSite` construct's `environment` prop.
2. The `sst bind` CLI will traverse up the directories to look for the root of your SST app.
3. It'll then find the file that's generated in step 1.
4. It'll load these as environment variables before running the start command.

:::note
`sst bind` only works if the Remix app is located inside the SST app or inside one of its subdirectories. For example:

```
/
  sst.config.ts
  my-remix-app/
```

:::

---

## Using AWS services

SST makes it very easy for your `RemixSite` construct to access other resources in your AWS account. Imagine you have an S3 bucket created using the [`Bucket`](../constructs/Bucket.md) construct. You can bind it to your Remix app.

```ts {5}
const bucket = new Bucket(stack, "Uploads");

const site = new RemixSite(stack, "Site", {
  path: "my-remix-app/",
  bind: [bucket],
});
```

This will attach the necessary IAM permissions and allow your Remix app to access the bucket through the typesafe [`sst/node`](../clients/index.md) client.

```ts {4}
import { Bucket } from "sst/node/bucket";

export async function loader() {
  console.log(Bucket.Uploads.bucketName);
}
```

You can read more about this over on the [Resource Binding](../resource-binding.md) doc.

:::info
The [`sst/node`](../clients/index.md) client utilizes top-level await and requires the Remix server to be built using the `esm` output format. Ensure that [`serverModuleFormat``](https://remix.run/docs/en/main/file-conventions/remix-config#servermoduleformat) is set to `esm` in your `remix.config.js`.
:::

---

## Warming

Server functions may experience performance issues due to Lambda cold starts. SST helps mitigate this by creating an EventBridge scheduled rule to periodically invoke the server function.

```ts {5}
new RemixSite(stack, "Site", {
  path: "my-remix-app/",
  warm: 20,
});
```

Setting `warm` to 20 keeps 20 server function instances active, invoking them every 5 minutes.

Note that warming is currently supported only in regional mode.

#### Cost

There are three components to the cost:

1. EventBridge scheduler: $0.00864

   ```
   Requests cost — 8,640 invocations per month x $1/million = $0.00864
   ```

1. Warmer function: $0.145728288

   ```
   Requests cost — 8,640 invocations per month x $0.2/million = $0.001728
   Duration cost — 8,640 invocations per month x 1GB memory x 1s duration x $0.0000166667/GB-second = $0.144000288
   ```

1. Server function: $0.0161280288 per warmed instance

   ```
   Requests cost — 8,640 invocations per month x $0.2/million = $0.001728
   Duration cost — 8,640 invocations per month x 1GB memory x 100ms duration x $0.0000166667/GB-second = $0.0144000288
   ```

For example, keeping 50 instances of the server function warm will cost approximately **$0.96 per month**

```
$0.00864 + $0.145728288 + $0.0161280288 x 50 = $0.960769728
```

This cost estimate is based on the `us-east-1` region pricing and does not consider any free tier benefits.

---

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

#### Configuring alternate domain names (Route 53 domains)

You can specify additional domain names for the site url. Note that the certificate for these names will not be automatically generated, so the certificate option must be specified. Also note that you need to manually create the Route 53 records for the alternate domain names.

```js
import * as acm from "aws-cdk-lib/aws-certificatemanager";
import * as route53 from "aws-cdk-lib/aws-route53";
import * as route53Targets from "aws-cdk-lib/aws-route53-targets";

// Look up hosted zone
const hostedZone = route53.HostedZone.fromLookup(stack, "HostedZone", {
  domainName: "domain.com",
});

// Create a certificate with alternate domain names
const certificate = new acm.DnsValidatedCertificate(stack, "Certificate", {
  domainName: "foo.domain.com",
  hostedZone,
  region: "us-east-1",
  subjectAlternativeNames: ["bar.domain.com"],
});

// Create site
const site = new RemixSite(stack, "Site", {
  path: "my-remix-app/",
  customDomain: {
    domainName: "foo.domain.com",
    alternateNames: ["bar.domain.com"],
    cdk: {
      hostedZone,
      certificate,
    },
  },
});

// Create A and AAAA records for the alternate domain names
const recordProps = {
  recordName: "bar.domain.com",
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
new RemixSite(stack, "Site", {
  path: "my-remix-app/",
  timeout: "5 seconds",
  memorySize: "2048 MB",
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

new RemixSite(stack, "Site", {
  path: "my-remix-app/",
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

```js
import { Bucket } from "aws-cdk-lib/aws-s3";
import { OriginAccessIdentity } from "aws-cdk-lib/aws-cloudfront";

new RemixSite(stack, "Site", {
  path: "my-remix-app/",
  cdk: {
    bucket: Bucket.fromBucketName(stack, "Bucket", "my-bucket"),
    // Required for non-public buckets
    s3Origin: {
      originAccessIdentity: OriginAccessIdentity.fromOriginAccessIdentityId(
        stack,
        "OriginAccessIdentity",
        "XXXXXXXX"
      ),
    },    
  },
});
```

Setting the `originAccessIdentity` prop enables an imported bucket to be properly secured with a bucket policy without giving public access to the bucket.

#### Reusing CloudFront cache policies

CloudFront has a limit of 20 cache policies per AWS account. This is a hard limit, and cannot be increased. If you plan to deploy multiple Remix sites, you can have the constructs share the same cache policies by reusing them across sites.

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

new RemixSite(stack, "Site1", {
  path: "my-remix-app/",
  cdk: {
    serverCachePolicy,
  },
});

new RemixSite(stack, "Site2", {
  path: "another-remix-app/",
  cdk: {
    serverCachePolicy,
  },
});
```

#### Protecting server function behind API Gateway

When deployed to a single region, instead of sending the request to the server function directly, you can send the request to API Gateway and have API Gateway proxy the request to the server function. With this setup, you can use features like authorizers to protect the server function.

```js
import { Fn } from "aws-cdk-lib";
import * as origins from "aws-cdk-lib/aws-cloudfront-origins";

// Create an API Gateway API
const api = new Api(stack, "Api");

// Configure the CloudFront distribution to route requests to the API endpoint
const site = new RemixSite(stack, "Site", {
  path: "my-remix-app/",
  cdk: {
    distribution: {
      defaultBehavior: {
        origin: new origins.HttpOrigin(Fn.parseDomainName(api.url)),
      },
    },
  },
});

// Configure the API Gateway to route all incoming requests to the site's SSR function
// Note: The site is not deployed when using the `sst dev` command
if (!app.local) {
  api.addRoutes(stack, {
    "ANY /{proxy+}": {
      type: "function",
      cdk: {
        function: site.cdk.function,
      },
    },
  });
}
```
