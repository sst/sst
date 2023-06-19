The `NuxtSite` construct is a higher level CDK construct that makes it easy to create an Nuxt app. It provides a simple way to build and deploy the app to AWS:

- The client assets are deployed to an S3 Bucket, and served out from a CloudFront CDN for fast content delivery.
- The app server is deployed to Lambda. You can deploy to Lambda@Edge instead if the `edge` flag is enabled. Read more about [Single region vs Edge](#single-region-vs-edge).
- It enables you to [configure custom domains](#custom-domains) for the website URL.
- It also enable you to [automatically set the environment variables](#environment-variables) for your Nuxt app directly from the outputs in your SST app.
- It provides a simple interface to [grant permissions](#using-aws-services) for your app to access AWS resources.

## Quick Start

1. If you are creating a new Nuxt app, run `nuxi init` from the root of your SST app.

   ```bash
   npx nuxi init my-nuxt-app
   ```

   After the Nuxt app is created, your SST app structure should look like:

   ```bash
   my-sst-app
   ├─ sst.config.ts
   ├─ services
   ├─ stacks
   └─ my-nuxt-app     <-- new Nuxt app
      ├─ public
      ├─ app.vue
      └─ nuxt.config.ts
   ```

   Continue to step 3.

2. Alternatively, if you have an existing Nuxt app, move the app to the root of your SST app. Your SST app structure should look like:

   ```bash
   my-sst-app
   ├─ sst.config.ts
   ├─ services
   ├─ stacks
   └─ my-nuxt-app     <-- new Nuxt app
      ├─ public
      ├─ app.vue
      └─ nuxt.config.ts
   ```

3. Let's set up the build preset for your nuxt app. Add `NITRO_PRESET=aws-lambda` as a env value present at build time. The preset will generate lambda compatible format. 

   ```diff
      "scripts": {
    -   "build": "nuxt build",
    +   "build": "NITRO_PRESET=aws-lambda nuxt build",
        "dev": "nuxt dev",
        "generate": "nuxt generate",
        "preview": "nuxt preview",
        "postinstall": "nuxt prepare"
      },
   ```

4. Also add the `sst bind` command to your Nuxt app's `package.json`. `sst env` enables you to [automatically set the environment variables](#environment-variables) for your Nuxt app directly from the outputs in your SST app.

   ```diff
      "scripts": {
        "build": "NITRO_PRESET=aws-lambda nuxt build",
        "dev": "sst bind nuxt dev",
        "generate": "nuxt generate",
        "preview": "nuxt preview",
        "postinstall": "nuxt prepare"
      }
   ```

5. Add the `NuxtSite` construct to an existing stack in your SST app. You can also create a new stack for the app.

   ```ts
   import { NuxtSite, StackContext } from "sst/constructs";

   export default function MyStack({ stack }: StackContext) {
     // ... existing constructs

     // Create the Nuxt site
     const site = new NuxtSite(stack, "Site", {
       path: "my-nuxt-app/",
     });

     // Add the site's URL to stack output
     stack.addOutputs({
       URL: site.url,
     });
   }
   ```

   When you are building your SST app, `NuxtSite` will invoke `npm build` inside the Nuxt app directory. Make sure `path` is pointing to the your Nuxt app.

   We also added the site's URL to the stack output. After the deploy succeeds, the URL will be printed out in the terminal.

## Working locally

To work on your Nuxt site locally with SST:

1. Start SST in your project root.

   ```bash
   npx sst dev
   ```

2. Then start your Nuxt site. This should run `sst bind nuxt dev`.

   ```bash
   npm run dev
   ```

:::note
When running `sst dev`, SST does not deploy your Nuxt site. It's meant to be run locally.
:::

## Single region vs edge

Currently Nuxt can only be deployed to single region. 

## Custom domains

You can configure the website with a custom domain hosted either on [Route 53](https://aws.amazon.com/route53/) or [externally](#configuring-externally-hosted-domain).

```js {5}
const site = new NuxtSite(stack, "Site", {
  path: "my-nuxt-app/",
  customDomain: "my-app.com",
});
```

Note that visitors to the `http://` URL will be redirected to the `https://` URL.

You can also configure an alias domain to point to the main domain. For example, to setup `www.my-app.com` redirecting to `my-app.com`:

```js {5}
const site = new NuxtSite(stack, "Site", {
  path: "my-nuxt-app/",
  customDomain: {
    domainName: "my-app.com",
    domainAlias: "www.my-app.com",
  },
});
```

## Environment variables

The `NuxtSite` construct allows you to set the environment variables in your Nuxt app based on outputs from other constructs in your SST app. So you don't have to hard code the config from your backend. Let's look at how.

To expose environment variables to your Nuxt application you should utilise the `NuxtSite` construct `environment` configuration property rather than an `.env` file within your Nuxt application root.

Imagine you have an API created using the [`Api`](../constructs/Api.md) construct, and you want to fetch data from the API. You'd pass the API's endpoint to your Nuxt app.

```ts {7-9}
const api = new Api(stack, "Api", {
  // ...
});

new NuxtSite(stack, "Site", {
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

Note that, in Nuxt, only environment variables prefixed with `NUXT_PUBLIC_` are available in your browser code. [Read more about using environment variables](https://nuxt.com/docs/api/composables/use-runtime-config#define-runtime-config).

For example, if you want to access the API's URL in your frontend js code, you'd name it `NUXT_PUBLIC_API_URL`:

```js
new NuxtSite(stack, "Site", {
  path: "path/to/site",
  environment: {
    NUXT_PUBLIC_API_URL: api.url,
  },
});
```

Let's take look at what is happening behind the scene.

#### While deploying

On `sst deploy`, the Nuxt app server is deployed to a Lambda function, and the NuxtSite's `environment` values are set as Lambda function environment variables. In this case, `process.env.NUXT_PUBLIC_API_URL` will be available at runtime.

#### While developing

To use these values while developing, run `sst dev` to start the [Live Lambda Development](/live-lambda-development.md) environment.

```bash
npx sst dev
```

Then in your Nuxt app to reference these variables, add the [`sst bind`](../packages/sst.md#sst-env) command.

```json title="package.json" {2}
    "scripts": {
      "build": "NITRO_PRESET=aws-lambda nuxt build",
      "dev": "sst bind nuxt dev",
      "generate": "nuxt generate",
      "preview": "nuxt preview",
      "postinstall": "nuxt prepare"
    }
```

Now you can start your Nuxt app as usual and it'll have the environment variables from your SST app.

```bash
npm run dev
```

There are a couple of things happening behind the scenes here:

1. The `sst dev` command generates a file with the values specified by the `NuxtSite` construct's `environment` prop.
2. The `sst bind` CLI will traverse up the directories to look for the root of your SST app.
3. It'll then find the file that's generated in step 1.
4. It'll load these as environment variables before running the start command.

:::note
`sst bind` only works if the Nuxt app is located inside the SST app or inside one of its subdirectories. For example:

```
/
  sst.config.ts
  my-nuxt-app/
```

:::

## Using AWS services

Since the `NuxtSite` construct deploys your Nuxt app to your AWS account, it's very convenient to access other resources in your AWS account. `NuxtSite` provides a simple way to grant [permissions](Permissions.md) to access specific AWS resources.

Imagine you have a DynamoDB table created using the [`Table`](../constructs/Table.md) construct, and you want to fetch data from the Table.

```ts {12}
const table = new Table(stack, "Table", {
  // ...
});

const site = new NuxtSite(stack, "Site", {
  path: "my-nuxt-app/",
  environment: {
    NUXT_TABLE_NAME: table.tableName,
  },
});

site.attachPermissions([table]);
```

Note that we are also passing the table name into the environment, so the Nuxt server code can fetch the value `process.env.NUXT_TABLE_NAME` when calling the DynamoDB API to query the table.

## Examples

### Configuring custom domains

You can configure the website with a custom domain hosted either on [Route 53](https://aws.amazon.com/route53/) or [externally](#configuring-externally-hosted-domain).

#### Using the basic config (Route 53 domains)

```js {3}
new NuxtSite(stack, "Site", {
  path: "my-nuxt-app/",
  customDomain: "my-app.com",
});
```

#### Redirect www to non-www (Route 53 domains)

```js {3-6}
new NuxtSite(stack, "Site", {
  path: "my-nuxt-app/",
  customDomain: {
    domainName: "my-app.com",
    domainAlias: "www.my-app.com",
  },
});
```

#### Configuring domains across stages (Route 53 domains)

```js {3-7}
new NuxtSite(stack, "Site", {
  path: "my-nuxt-app/",
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
const site = new NuxtSite(stack, "Site", {
  path: "my-nuxt-app/",
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

new NuxtSite(stack, "Site", {
  path: "my-nuxt-app/",
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

new NuxtSite(stack, "Site", {
  path: "my-nuxt-app/",
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

new NuxtSite(stack, "Site", {
  path: "my-nuxt-app/",
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
new NuxtSite(stack, "Site", {
  path: "my-nuxt-app/",
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

new NuxtSite(stack, "Site", {
  path: "my-nuxt-app/",
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

new NuxtSite(stack, "Site", {
  path: "my-nuxt-app/",
  cdk: {
    bucket: s3.Bucket.fromBucketName(stack, "Bucket", "my-bucket"),
  },
});
```

#### Reusing CloudFront cache policies

CloudFront has a limit of 20 cache policies per AWS account. This is a hard limit, and cannot be increased. If you plan to deploy multiple Nuxt sites, you can have the constructs share the same cache policies by reusing them across sites.

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

new NuxtSite(stack, "Site1", {
  path: "my-nuxt-app/",
  cdk: {
    serverCachePolicy,
  },
});

new NuxtSite(stack, "Site2", {
  path: "another-nuxt-app/",
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

const site = new NuxtSite(stack, "Site", {
  path: "my-nuxt-app/",
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
