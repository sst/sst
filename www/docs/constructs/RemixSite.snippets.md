### Creating a Remix app

We recommend the following process to bootstrap a Remix application that will be compatible with this construct.

1. Within the root of your SST project run the Remix CLI to create an application;

   ```bash title="Create a Remix application"
   npx create-remix@latest
   ```

2. When presented with the type of deployment question, select "Remix App Server";

   ![Selecting "Remix App Server" deployment](/img/remix/bootstrap-remix.png)

3. After the installation has complete add the following dependency to your Remix application;

   ```bash title="Install sst-env"
   npm install --save-dev @serverless-stack/static-site-env
   ```

   > Or use your package manager of choices form of the above.

4. Update your package.json scripts;

   ```diff title="Update package.json scripts"
     "scripts": {
       "build": "remix build",
   -   "dev": "remix dev",
   +   "dev": "sst-env -- remix dev",
   -   "start": "remix-serve build"
     },
   ```

5. Create your stack and add the `RemixSite` construct, pointing at the new application;

   ```js title="Create RemixSite instance"
   new RemixSite(stack, "RemixSite", {
     path: "path/to/site",
   });
   ```

> **Note**
>
> We depend on your "build" script to bundle your Remix application. We are aware that Remix does not enable you to customise their underlying build configuration and that it is often the case that the "build" script is extended to perform additional functions such as Tailwind compilation. Therefore we feel that targetting the "build" script rather than the `remix build` command directly will ensure that all your required build artifacts are available prior to deployment.

### Environment variables

The `RemixSite` construct allows you to set the environment variables in your Remix app based on outputs from other constructs in your SST app. So you don't have to hard code the config from your backend. Let's look at how.

Remix only supports environment variables in the server build. If your require environment variables within your routes/components then we recommend that you [follow their documentation](https://remix.run/docs/en/v1/guides/envvars#browser-environment-variables), returning the required environment variables within the `loader` associated within your Remix route.

```js title="app/routes/index.tsx"
// Loaders will only be included in your server build and the environment
// variables will be available;
export async function loader() {
  return json({
    ENV: {
      apiUrl: process.env.API_URL,
      userPoolClient: process.env.USER_POOL_CLIENT,
    }
  });
}
```

To expose environment variables to your Remix application you should utilise the `RemixSite` construct `environment` configuration property rather than an `.env` file within your Remix application root.

```js {3-6}
new RemixSite(this, "RemixSite", {
  path: "path/to/site",
  environment: {
    API_URL: api.url,
    USER_POOL_CLIENT: auth.cognitoUserPoolClient.userPoolClientId,
  },
});
```

Where `api.url` or `auth.cognitoUserPoolClient.userPoolClientId` are coming from other constructs in your SST app.

#### While deploying

On `sst deploy` we deploy your Remix server to Lamba@Edge, which does not support runtime environment. To get around this limitation the environment variables will first be replaced by placeholder values, `{{ API_URL }}` and `{{ USER_POOL_CLIENT }}`, when building the Remix app. And after the referenced resources have been created, the Api and User Pool in this case, the placeholders in the server JS will then be replaced with the actual values.

:::caution
We only replace environment variables within the code that is deployed to your Lamba@Edge. i.e. the server for your Remix application. This keeps in line with Remix's expectations laid out in their documentation.

Do not use environment variables (e.g. `process.env.API_URL`) directly within any components that will be included in the browser build for your Remix application. You should instead pass the environment variables down via your route `loader`;

```javascript
// Loaders will only be included in your server build and the environment
// variables will hence be substituted in the deployment process;
export async function loader() {
  return json({
    ENV: {
      apiUrl: process.env.API_URL,
      userPoolClient: process.env.USER_POOL_CLIENT,
    }
  });
}
```

You can read more about this strategy within the [Remix documentation](https://remix.run/docs/en/v1/guides/envvars#browser-environment-variables).
:::

#### While developing

To use these values while developing, run `sst start` to start the [Live Lambda Development](/live-lambda-development.md) environment.

``` bash
npm start
```

Then in your Remix app to reference these variables, add the [`sst-env`](/packages/static-site-env.md) package.

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
  remix-app/
```
:::

### Custom domains

You can configure the website with a custom domain hosted either on [Route 53](https://aws.amazon.com/route53/) or [externally](#configuring-externally-hosted-domain).

#### Using the basic config (Route 53 domains)

```js {3}
new RemixSite(this, "Site", {
  path: "path/to/site",
  customDomain: "domain.com",
});
```

#### Redirect www to non-www (Route 53 domains)

```js {3-6}
new RemixSite(this, "Site", {
  path: "path/to/site",
  customDomain: {
    domainName: "domain.com",
    domainAlias: "www.domain.com",
  },
});
```

#### Configuring domains across stages (Route 53 domains)

```js {3-7}
new RemixSite(this, "Site", {
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
new RemixSite(this, "Site", {
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

new RemixSite(this, "Site", {
  path: "path/to/site",
  customDomain: {
    domainName: "domain.com",
    cdk: {
      certificate: Certificate.fromCertificateArn(this, "MyCert", certArn),
    },
  },
});
```

Note that, the certificate needs be created in the `us-east-1`(N. Virginia) region as required by AWS CloudFront.

#### Specifying a hosted zone (Route 53 domains)

If you have multiple hosted zones for a given domain, you can choose the one you want to use to configure the domain.

```js {8-11}
import { HostedZone } from "aws-cdk-lib/aws-route53";

new RemixSite(this, "Site", {
  path: "path/to/site",
  customDomain: {
    domainName: "domain.com",
    cdk: {
      hostedZone: HostedZone.fromHostedZoneAttributes(this, "MyZone", {
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

new RemixSite(this, "Site", {
  path: "path/to/site",
  cutomDomain: {
    isExternalDomain: true,
    domainName: "domain.com",
    cdk: {
      certificate: Certificate.fromCertificateArn(this, "MyCert", certArn),
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

You can attach a set of [permissions](Permissions.md) to allow the Remix server lambda, enabling it to access other AWS resources.

```js {5}
const site = new RemixSite(this, "Site", {
  path: "path/to/site",
});

site.attachPermissions(["sns"]);
```

### Advanced examples

#### Configuring the Lambda Function

Configure the internally created CDK [`Lambda Function`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_lambda.Function.html) instance.

```js {4-8}
new RemixSite(this, "Site", {
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

CloudFront has a limit of 20 cache policies per AWS account. This is a hard limit, and cannot be increased. Each `RemixSite` creates 3 cache policies. If you plan to deploy multiple Remix sites, you can have the constructs share the same cache policies by reusing them across sites.

```js
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";

const cachePolicies = {
  browserBuildCachePolicy: new cloudfront.CachePolicy(this, "BrowserBuildStaticsCache", RemixSite.browserBuildCachePolicyProps),
  publicCachePolicy: new cloudfront.CachePolicy(this, "PublicStaticsCache", RemixSite.publicCachePolicyProps),
  serverResponseCachePolicy: new cloudfront.CachePolicy(this, "ServerResponseCache", RemixSite.serverResponseCachePolicyProps),
};

new RemixSite(this, "Site1", {
  path: "path/to/site1",
  cdk: {
    cachePolicies,
  }
});

new RemixSite(this, "Site2", {
  path: "path/to/site2",
  cdk: {
    cachePolicies,
  }
});
```
