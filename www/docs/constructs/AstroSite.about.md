The `AstroSite` construct is a higher level CDK construct that makes it easy to create an Astro app. It provides a simple way to build and deploy the app to AWS:

- It supports `static`, `server`, and `hybrid` modes.
- The client assets are deployed to an S3 Bucket, and served out from a CloudFront CDN for fast content delivery.
- The app server is deployed to either Lambda for `regional` or Lambda@Edge for `edge` deployments. Read more about [Single region vs Edge](#single-region-vs-edge).
- It enables you to [configure custom domains](#custom-domains) for the website URL.
- It also enable you to [automatically set the environment variables](#environment-variables) for your Astro app directly from the outputs in your SST app.
- It provides a simple interface to [grant permissions](#using-aws-services) for your app to access AWS resources.

## Quick Start

1. If you are creating a new Astro app, run `create-astro` from the root of your SST app.

   ```bash
   npx create-astro@latest
   ```

   And select `Astro App Server` as the deployment target.

   ![Select Astro App template](/img/astro/bootstrap-astro.png)

   After the Astro app is created, your SST app structure should look like:

   ```bash
   my-sst-app
   ├─ sst.config.ts
   ├─ services
   ├─ stacks
   └─ my-astro-app     <-- new Astro app
      ├─ src
      ├─ public
      └─ astro.config.mjs
   ```

   Continue to step 3.

2. Alternatively, if you have an existing Astro app, move the app to the root of your SST app. Your SST app structure should look like:

   ```bash
   my-sst-app
   ├─ sst.config.ts
   ├─ services
   ├─ stacks
   └─ my-astro-app     <-- your Astro app
      ├─ src
      ├─ public
      └─ astro.config.mjs
   ```

3. Let's set up the [`astro-sst` adapter](https://www.npmjs.com/package/astro-sst) for your Astro app. The adapter will transform the SSR functions to a format that can be deployed to AWS. To do that, run `astro add` from your Astro app.

   ```sh
   npx astro add astro-sst
   ```

   This will install the adapter and make the appropriate changes to your `astro.config.mjs` file in one step.

4. Also add the `sst bind` command to your Astro app's `package.json`. `sst bind` enables you to [automatically set the environment variables](#environment-variables) for your Astro app directly from the outputs in your SST app.

   ```diff
     "scripts": {
   -   "dev": "astro dev",
   +   "dev": "sst bind astro dev",
       "start": "astro dev",
       "build": "astro build",
       "preview": "astro preview",
       "astro": "astro"
     },
   ```

5. Add the `AstroSite` construct to an existing stack in your SST app. You can also create a new stack for the app.

   ```ts
   import { AstroSite, StackContext } from "sst/constructs";

   export default function MyStack({ stack }: StackContext) {
     // ... existing constructs

     // Create the Astro site
     const site = new AstroSite(stack, "Site", {
       path: "my-astro-app/",
     });

     // Add the site's URL to stack output
     stack.addOutputs({
       URL: site.url,
     });
   }
   ```

   When you are building your SST app, `AstroSite` will invoke `npm build` inside the Astro app directory. Make sure `path` is pointing to the your Astro app.

   We also added the site's URL to the stack output. After the deploy succeeds, the URL will be printed out in the terminal.

## Working locally

To work on your Astro site locally with SST:

1. Start SST in your project root.

   ```bash
   npx sst dev
   ```

2. Then start your Astro site. This should run `sst bind astro dev`.

   ```bash
   npm run dev
   ```

:::note
When running `sst dev`, SST does not deploy your Astro site. It's meant to be run locally.
:::

## Single region vs edge

There are two ways you can deploy the Astro app to your AWS account.

By default, the Astro app server is deployed to a single region defined in your `sst.config.ts` or passed in via the `--region` flag. Alternatively, you can choose to deploy to the edge. When deployed to the edge, loaders/actions are running on edge location that is physically closer to the end user. In this case, the app server is deployed to AWS Lambda@Edge.

You can enable edge like this:

```js title="astro.config.mjs"
import { defineConfig } from "astro/config";
import aws from "astro-sst";

export default defineConfig({
  output: "server",
  adapter: aws({
    deploymentStrategy: "edge",
  }),
});
```

Note that, in the case you have a centralized database, Edge locations are often far away from your database. If you are querying your database in your loaders/actions, you might experience much longer latency when deployed to the edge.

:::info
We recommend you to deploy to a single region when unsure.
:::

#### Server Routes

Due to the [CloudFront limit of 25 path pattern per distribution](https://docs.sst.dev/known-issues#cloudfront-cachebehaviors-limit-exceeded), it's impractical to create one path for each route in your Astro app. To work around this limitation, all routes are first checked against the S3 cache before being directed to the Lambda function for server rendering. This method utilizes the CloudFront origin group, with the S3 bucket serving as the primary origin and the server function as the failover origin. Note that the origin group can only support `GET`, `HEAD`, and `OPTIONS` request methods. To support other request methods, you should specify the route patterns in the `astro.config.mjs` file as the `serverRoutes` parameter on the adapter registration method (ie `aws({serverRoutes: []})`).

```js
export default defineConfig({
  adapter: aws({
    serverRoutes: [
      "feedback", // Feedback page which requires POST method
      "login",    // Login page which requires POST method
      "user/*",   // Directory of user routes which are all SSR
      "api/*"     // Directory of API endpoints which require all methods
    ]
  })
})
```

Route patterns are case sensitive. And the following wildcard characters can be used:
- \* matches 0 or more characters.
- ? matches exactly 1 character.

## Streaming

Astro natively supports [streaming](https://docs.astro.build/en/guides/server-side-rendering/#streaming), allowing a page to be broken down into chunks. These chunks can be sent over the network in sequential order and then incrementally rendered in the browser. This process can significantly enhances page performance and allow larger responses sizes than buffered responses, but there is a slight performance overhead. To enable streaming, set the `responseMode` property on the adapter registration method within the `astro.config.mjs` to `stream`. The default response mode is `buffer` which will wait for the entire response to be generated before sending it to the client.

```js title="astro.config.mjs"
export default defineConfig({
  adapter: aws({
    responseMode: "stream"
  })
})
```

:::info
Currently streaming is only supported by `AstroSite` when deployed in single region mode.
:::

## Custom domains

You can configure the website with a custom domain hosted either on [Route 53](https://aws.amazon.com/route53/) or [externally](#configuring-externally-hosted-domain).

```js {5}
const site = new AstroSite(stack, "Site", {
  path: "my-astro-app/",
  customDomain: "my-app.com",
});
```

Note that visitors to the `http://` URL will be redirected to the `https://` URL.

You can also configure an alias domain to point to the main domain. For example, to setup `www.my-app.com` redirecting to `my-app.com`:

```js {5}
const site = new AstroSite(stack, "Site", {
  path: "my-astro-app/",
  customDomain: {
    domainName: "my-app.com",
    domainAlias: "www.my-app.com",
  },
});
```

## Environment variables

The `AstroSite` construct allows you to set the environment variables in your Astro app based on outputs from other constructs in your SST app. So you don't have to hard code the config from your backend. Let's look at how.

To expose environment variables to your Astro application you should utilise the `AstroSite` construct `environment` configuration property rather than an `.env` file within your Astro application root.

Imagine you have an API created using the [`Api`](../constructs/Api.md) construct, and you want to fetch data from the API. You'd pass the API's endpoint to your Astro app.

```ts {7-9}
const api = new Api(stack, "Api", {
  // ...
});

new AstroSite(stack, "Site", {
  path: "path/to/site",
  environment: {
    API_URL: api.url,
  },
});
```

Then you can access the API's URL in your server code:

```ts
const data = await db(import.meta.env.API_URL);
```

Note that, in Astro, only environment variables prefixed with `PUBLIC_` are available in your browser code. [Read more about using environment variables](https://docs.astro.build/en/guides/environment-variables/).

For example, if you want to access the API's URL in your frontend js code, you'd name it `PUBLIC_API_URL`:

```js
new AstroSite(stack, "Site", {
  path: "path/to/site",
  environment: {
    PUBLIC_API_URL: api.url,
  },
});
```

Let's take look at what is happening behind the scene.

#### While deploying

On `sst deploy`, the Astro app server is deployed to a Lambda function, and the AstroSite's `environment` values are set as Lambda function environment variables. In this case, `process.env.API_URL` will be available at runtime.

If you enabled the `edge` option, the Astro app server will instead get deployed to a Lambda@Edge function. We have an issue here, AWS Lambda@Edge does not support runtime environment variables. To get around this limitation, we insert a snippet to the top of your app server:

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

Then in your Astro app to reference these variables, add the [`sst bind`](../packages/sst.md#sst-env) command.

```json title="package.json" {2}
"scripts": {
  "dev": "sst bind astro dev",
  "start": "astro dev",
  "build": "astro build",
  "preview": "astro preview",
  "astro": "astro"
},
```

Now you can start your Astro app as usual and it'll have the environment variables from your SST app.

```bash
npm run dev
```

There are a couple of things happening behind the scenes here:

1. The `sst dev` command generates a file with the values specified by the `AstroSite` construct's `environment` prop.
2. The `sst bind` CLI will traverse up the directories to look for the root of your SST app.
3. It'll then find the file that's generated in step 1.
4. It'll load these as environment variables before running the start command.

:::note
`sst bind` only works if the Astro app is located inside the SST app or inside one of its subdirectories. For example:

```
/
  sst.config.ts
  my-astro-app/
```

:::

## Using AWS services

Since the `AstroSite` construct deploys your Astro app to your AWS account, it's very convenient to access other resources in your AWS account. `AstroSite` provides a simple way to grant [permissions](Permissions.md) to access specific AWS resources.

Imagine you have a DynamoDB table created using the [`Table`](../constructs/Table.md) construct, and you want to fetch data from the Table.

```ts {12}
const table = new Table(stack, "Table", {
  // ...
});

const site = new AstroSite(stack, "Site", {
  path: "my-astro-app/",
  environment: {
    TABLE_NAME: table.tableName,
  },
});

site.attachPermissions([table]);
```

Note that we are also passing the table name into the environment, so the Astro server code can fetch the value `process.env.TABLE_NAME` when calling the DynamoDB API to query the table.

---

## Warming

Server functions may experience performance issues due to Lambda cold starts. SST helps mitigate this by creating an EventBridge scheduled rule to periodically invoke the server function.

```ts {5}
new AstroSite(stack, "Site", {
  path: "my-astro-app/",
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
new AstroSite(stack, "Site", {
  path: "my-astro-app/",
  customDomain: "my-app.com",
});
```

#### Redirect www to non-www (Route 53 domains)

```js {3-6}
new AstroSite(stack, "Site", {
  path: "my-astro-app/",
  customDomain: {
    domainName: "my-app.com",
    domainAlias: "www.my-app.com",
  },
});
```

#### Configuring domains across stages (Route 53 domains)

```js {3-7}
new AstroSite(stack, "Site", {
  path: "my-astro-app/",
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
const site = new AstroSite(stack, "Site", {
  path: "my-astro-app/",
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

new AstroSite(stack, "Site", {
  path: "my-astro-app/",
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

new AstroSite(stack, "Site", {
  path: "my-astro-app/",
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

new AstroSite(stack, "Site", {
  path: "my-astro-app/",
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
new AstroSite(stack, "Site", {
  path: "my-astro-app/",
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

new AstroSite(stack, "Site", {
  path: "my-astro-app/",
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

new AstroSite(stack, "Site", {
  path: "my-astro-app/",
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

CloudFront has a limit of 20 cache policies per AWS account. This is a hard limit, and cannot be increased. If you plan to deploy multiple Astro sites, you can have the constructs share the same cache policies by reusing them across sites.

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

new AstroSite(stack, "Site1", {
  path: "my-astro-app/",
  cdk: {
    serverCachePolicy,
  },
});

new AstroSite(stack, "Site2", {
  path: "another-astro-app/",
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
const site = new AstroSite(stack, "Site", {
  path: "my-astro-app/",
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

## Common Errors

### CloudFront 403 Error - The request could not be satisfied.

**Error message:**
```
403 ERROR
The request could not be satisfied.
This distribution is not configured to allow the HTTP request method that was used for this request. The distribution supports only cachable requests. We can't connect to the server for this app or website at this time. There might be too much traffic or a configuration error. Try again later, or contact the app or website owner.
```

This typically occurs when the site is deployed in the regional mode. It's likely because the request method was not `GET`, and the requested route was not specified in the [`serverRoutes`](#server-routes) property in the `astro.config.mjs` file. To resolve this, add a route pattern to the `serverRoutes` property that matches the requested route.