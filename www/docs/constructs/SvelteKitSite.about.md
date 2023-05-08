The `SvelteKitSite` construct is a higher level CDK construct that makes it easy to create an SvelteKit app. It provides a simple way to build and deploy the app to AWS:

- The client assets are deployed to an S3 Bucket, and served out from a CloudFront CDN for fast content delivery.
- The app server is deployed to Lambda. You can deploy to Lambda@Edge instead if the `edge` flag is enabled. Read more about [Single region vs Edge](#single-region-vs-edge).
- It enables you to [configure custom domains](#custom-domains) for the website URL.
- It also enable you to [automatically set the environment variables](#environment-variables) for your SvelteKit app directly from the outputs in your SST app.
- It provides a simple interface to [grant permissions](#using-aws-services) for your app to access AWS resources.

## Quick Start

1. If you are creating a new SvelteKit app, run `create-svelte` from the root of your SST app.

   ```bash
   npx create-svelte@latest
   ```

   And select `SvelteKit App Server` as the deployment target.

   ![Select SvelteKit App template](/img/svelte-kit/bootstrap-svelte-kit.png)

   After the SvelteKit app is created, your SST app structure should look like:

   ```bash
   my-sst-app
   ├─ sst.config.ts
   ├─ services
   ├─ stacks
   └─ my-svelte-app     <-- new SvelteKit app
      ├─ src
      ├─ static
      └─ svelte.config.js
   ```

   Continue to step 3.

2. Alternatively, if you have an existing SvelteKit app, move the app to the root of your SST app. Your SST app structure should look like:

   ```bash
   my-sst-app
   ├─ sst.config.ts
   ├─ services
   ├─ stacks
   └─ my-svelte-app     <-- your SvelteKit app
      ├─ src
      ├─ static
      └─ svelte.config.js
   ```

3. Let's set up the [`svelte-kit-sst` adapter](https://www.npmjs.com/package/svelte-kit-sst) for your SvelteKit app. The adapter will transform the SSR functions to a format that can be deployed to AWS. To do that, make sure your `svelte.config.js` looks like the following.

   ```js
   import adapter from "svelte-kit-sst";
   import { vitePreprocess } from "@sveltejs/kit/vite";
 
   const config = {
     preprocess: vitePreprocess(),
     kit: {
       adapter: adapter()
     }
   };
 
   export default config;
   ```

   And add the `svelte-kit-sst` dependency to your SvelteKit app's `package.json`.

   ```bash
   npm install --save-dev svelte-kit-sst
   ```

4. Also add the `sst bind` command to your SvelteKit app's `package.json`. `sst env` enables you to [automatically set the environment variables](#environment-variables) for your SvelteKit app directly from the outputs in your SST app.

   ```diff
     "scripts": {
   -   "dev": "vite dev",
   +   "dev": "sst bind vite dev",
       "build": "vite build",
       "preview": "vite preview"
     },
   ```

5. Add the `SvelteKitSite` construct to an existing stack in your SST app. You can also create a new stack for the app.

   ```ts
   import { SvelteKitSite, StackContext } from "sst/constructs";

   export default function MyStack({ stack }: StackContext) {
     // ... existing constructs

     // Create the SvelteKit site
     const site = new SvelteKitSite(stack, "Site", {
       path: "my-svelte-app/",
     });

     // Add the site's URL to stack output
     stack.addOutputs({
       URL: site.url,
     });
   }
   ```

   When you are building your SST app, `SvelteKitSite` will invoke `npm build` inside the SvelteKit app directory. Make sure `path` is pointing to the your SvelteKit app.

   We also added the site's URL to the stack output. After the deploy succeeds, the URL will be printed out in the terminal.

## Working locally

To work on your SvelteKit site locally with SST:

1. Start SST in your project root.

   ```bash
   npx sst dev
   ```

2. Then start your SvelteKit site. This should run `sst bind vite dev`.

   ```bash
   npm run dev
   ```

:::note
When running `sst dev`, SST does not deploy your SvelteKit site. It's meant to be run locally.
:::

## Single region vs edge

There are two ways you can deploy the SvelteKit app to your AWS account.

By default, the SvelteKit app server is deployed to a single region defined in your `sst.config.ts` or passed in via the `--region` flag. Alternatively, you can choose to deploy to the edge. When deployed to the edge, loaders/actions are running on edge location that is physically closer to the end user. In this case, the app server is deployed to AWS Lambda@Edge.

You can enable edge like this:

```ts
const site = new SvelteKitSite(stack, "Site", {
  path: "my-svelte-app/",
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
const site = new SvelteKitSite(stack, "Site", {
  path: "my-svelte-app/",
  customDomain: "my-app.com",
});
```

Note that visitors to the `http://` URL will be redirected to the `https://` URL.

You can also configure an alias domain to point to the main domain. For example, to setup `www.my-app.com` redirecting to `my-app.com`:

```js {5}
const site = new SvelteKitSite(stack, "Site", {
  path: "my-svelte-app/",
  customDomain: {
    domainName: "my-app.com",
    domainAlias: "www.my-app.com",
  },
});
```

## Environment variables

The `SvelteKitSite` construct allows you to set the environment variables in your SvelteKit app based on outputs from other constructs in your SST app. So you don't have to hard code the config from your backend. Let's look at how.

To expose environment variables to your SvelteKit application you should utilise the `SvelteKitSite` construct `environment` configuration property rather than an `.env` file within your SvelteKit application root.

Imagine you have an API created using the [`Api`](../constructs/Api.md) construct, and you want to fetch data from the API. You'd pass the API's endpoint to your SvelteKit app.

```ts {7-9}
const api = new Api(stack, "Api", {
  // ...
});

new SvelteKitSite(stack, "Site", {
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

Note that, in SvelteKit, only environment variables prefixed with `PUBLIC_` are available in your browser code. [Read more about using environment variables](https://learn.svelte.dev/tutorial/env-static-public).

For example, if you want to access the API's URL in your frontend js code, you'd name it `PUBLIC_API_URL`:

```js
new SvelteKitSite(stack, "Site", {
  path: "path/to/site",
  environment: {
    PUBLIC_API_URL: api.url,
  },
});
```

Let's take look at what is happening behind the scene.

#### While deploying

On `sst deploy`, the SvelteKit app server is deployed to a Lambda function, and the SvelteKitSite's `environment` values are set as Lambda function environment variables. In this case, `process.env.API_URL` will be available at runtime.

If you enabled the `edge` option, the SvelteKit app server will instead get deployed to a Lambda@Edge function. We have an issue here, AWS Lambda@Edge does not support runtime environment variables. To get around this limitation, we insert a snippet to the top of your app server:

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

Then in your SvelteKit app to reference these variables, add the [`sst bind`](../packages/sst.md#sst-env) command.

```json title="package.json" {2}
"scripts": {
  "dev": "sst bind vite dev",
  "build": "vite build",
  "preview": "vite preview"
},
```

Now you can start your SvelteKit app as usual and it'll have the environment variables from your SST app.

```bash
npm run dev
```

There are a couple of things happening behind the scenes here:

1. The `sst dev` command generates a file with the values specified by the `SvelteKitSite` construct's `environment` prop.
2. The `sst bind` CLI will traverse up the directories to look for the root of your SST app.
3. It'll then find the file that's generated in step 1.
4. It'll load these as environment variables before running the start command.

:::note
`sst bind` only works if the SvelteKit app is located inside the SST app or inside one of its subdirectories. For example:

```
/
  sst.config.ts
  my-svelte-app/
```

:::

## Using AWS services

Since the `SvelteKitSite` construct deploys your SvelteKit app to your AWS account, it's very convenient to access other resources in your AWS account. `SvelteKitSite` provides a simple way to grant [permissions](Permissions.md) to access specific AWS resources.

Imagine you have a DynamoDB table created using the [`Table`](../constructs/Table.md) construct, and you want to fetch data from the Table.

```ts {12}
const table = new Table(stack, "Table", {
  // ...
});

const site = new SvelteKitSite(stack, "Site", {
  path: "my-svelte-app/",
  environment: {
    TABLE_NAME: table.tableName,
  },
});

site.attachPermissions([table]);
```

Note that we are also passing the table name into the environment, so the SvelteKit server code can fetch the value `process.env.TABLE_NAME` when calling the DynamoDB API to query the table.

## Architecture

The SvelteKit build output consists of three components:
- **Client files** — ie. `favicon.png`
- **Server files** — ie. Svelte server code
- **Prerendered files** — ie. prerendered pages and page data

#### Regional mode

In regional mode:

- Client files are uploaded to S3
- Server files are bundled and deployed to Lambda
- Prerendered files are copied into the server Lambda bundle

The CloudFront distribution is set up to route:

- Requests for static files to S3 (ie. `favicon.png`)
- Requests for immutable asset files to S3 (ie. `/_app/immutable/*`)
- Other requests to the Lambda function
  - If the request is for a prerendered page, the function serves the prerendered files packaged in the function bundle.
  - If the request is for a server-side rendered (SSR) page, the function runs the SvelteKit server to handle the request.

#### Edge mode

In edge mode:

- Client files are uploaded to S3
- Server files are bundled and deployed to Lambda@Edge
- Prerendered files are uploaded to S3

The CloudFront distribution is set up to route:

- Requests for static files to S3 (ie. `/favicon.png`)
- Requests for immutable asset files to S3 (ie. `/_app/immutable/*`)
- Other requests to the Lambda@Edge function
  - If the request is for a prerendered page, the edge function forwards the request to S3.
  - If the request is for a server-side rendered (SSR) page, the edge function run the SvelteKit server to handle the request.


#### Summary

| | Example | Regional Mode | Edge Mode |
| - | ------------------------------- | -------------------------------------------- | -------------------------------------------- |
| **At deploy time** | | | |
| Client files | `favicon.png`| Uploaded to S3 | Uploaded to S3 |
| Server files | SvelteKit server code | Deployed to Lambda | Deployed to Lambda@Edge |
| Prerendered files | `about.html` | Copied into the server Lambda bundle | Uploaded to S3 |
| **At run time** | | | |
| Requests for static files | `/favicon.png` | Routed to S3 | Routed to S3 |
| Requests for immutable assets | `/_app/immutable/assets/_page.9d501049.css` | Routed to S3 | Routed to S3 |
| Requests for prerendered pages | `/about` | Routed to Lambda and served from function bundle | Routed to Lambda and forwarded to S3 |
| Requests for SSR pages | `/my-home-feed` | Routed to Lambda and handled by SvelteKit server | Routed to Lambda and handled by SvelteKit server |

## Examples

### Configuring custom domains

You can configure the website with a custom domain hosted either on [Route 53](https://aws.amazon.com/route53/) or [externally](#configuring-externally-hosted-domain).

#### Using the basic config (Route 53 domains)

```js {3}
new SvelteKitSite(stack, "Site", {
  path: "my-svelte-app/",
  customDomain: "my-app.com",
});
```

#### Redirect www to non-www (Route 53 domains)

```js {3-6}
new SvelteKitSite(stack, "Site", {
  path: "my-svelte-app/",
  customDomain: {
    domainName: "my-app.com",
    domainAlias: "www.my-app.com",
  },
});
```

#### Configuring domains across stages (Route 53 domains)

```js {3-7}
new SvelteKitSite(stack, "Site", {
  path: "my-svelte-app/",
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
const site = new SvelteKitSite(stack, "Site", {
  path: "my-svelte-app/",
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

new SvelteKitSite(stack, "Site", {
  path: "my-svelte-app/",
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

new SvelteKitSite(stack, "Site", {
  path: "my-svelte-app/",
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

new SvelteKitSite(stack, "Site", {
  path: "my-svelte-app/",
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

### Configuring server function

```js {3-4}
new SvelteKitSite(stack, "Site", {
  path: "my-svelte-app/",
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

new SvelteKitSite(stack, "Site", {
  path: "my-svelte-app/",
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

new SvelteKitSite(stack, "Site", {
  path: "my-svelte-app/",
  cdk: {
    bucket: s3.Bucket.fromBucketName(stack, "Bucket", "my-bucket"),
  },
});
```

#### Reusing CloudFront cache policies

CloudFront has a limit of 20 cache policies per AWS account. This is a hard limit, and cannot be increased. If you plan to deploy multiple SvelteKit sites, you can have the constructs share the same cache policies by reusing them across sites.

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

new SvelteKitSite(stack, "Site1", {
  path: "my-svelte-app/",
  cdk: {
    serverCachePolicy,
  },
});

new SvelteKitSite(stack, "Site2", {
  path: "another-svelte-app/",
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

const api = new Api(stack, "Api");

const site = new SvelteKitSite(stack, "Site", {
  path: "my-svelte-app/",
  cdk: {
    distribution: {
      defaultBehavior: {
        origin: new origins.HttpOrigin(Fn.parseDomainName(api.url)),
      },
    },
  },
});

api.addRoutes(stack, {
  "ANY /{proxy+}": {
    type: "function",
    cdk: {
      function: site.cdk.function,
    },
  },
});
```
