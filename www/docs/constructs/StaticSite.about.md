The `StaticSite` construct is a higher level CDK construct that makes it easy to create a static website. It provides a simple way to build and deploy the site to an S3 bucket; setup a CloudFront CDN for fast content delivery; and configure a custom domain for the website URL. In addition:

- Visitors to the `http://` url will be redirected to the `https://` URL.
- If a [domain alias](#domainalias) is configured, visitors to the alias domain will be redirected to the main one. So if `www.example.com` is the domain alias for `example.com`, visitors to `www.example.com` will be redirected to `example.com`.

## Examples

The `StaticSite` construct is designed to make it easy to get started with, while allowing for a way to fully configure it as well. Let's look at how, through a couple of examples.

### Creating a plain HTML site

Deploys a plain HTML website in the `path/to/src` directory.

```js
import { StaticSite } from "@serverless-stack/resources";

new StaticSite(stack, "Site", {
  path: "path/to/src",
});
```

### Creating a React site

```js
new StaticSite(stack, "ReactSite", {
  path: "path/to/src",
  buildOutput: "build",
  buildCommand: "npm run build",
  errorPage: "redirect_to_index_page",
});
```

If you are using [Create React App](https://create-react-app.dev), we created the [`ReactStaticSite`](ReactStaticSite.md) construct to make it even easier to deploy React apps.

### Creating a Vue.js site

```js
new StaticSite(stack, "VueJSSite", {
  path: "path/to/src",
  buildOutput: "dist",
  buildCommand: "npm run build",
  errorPage: "redirect_to_index_page",
});
```

### Creating a Gatsby site

```js
new StaticSite(stack, "GatsbySite", {
  path: "path/to/src",
  errorPage: "404.html",
  buildOutput: "public",
  buildCommand: "npm run build",
});
```

### Creating a Jekyll site

```js
new StaticSite(stack, "JekyllSite", {
  path: "path/to/src",
  errorPage: "404.html",
  buildOutput: "_site",
  buildCommand: "bundle exec jekyll build",
});
```

### Creating an Angular site

```js
new StaticSite(stack, "AngularSite", {
  path: "path/to/src",
  buildOutput: "dist",
  buildCommand: "ng build --output-path dist",
  errorPage: "redirect_to_index_page",
});
```

### Creating a Svelte site

```js
new StaticSite(stack, "SvelteSite", {
  path: "path/to/src",
  buildOutput: "dist",
  buildCommand: "npm run build",
  errorPage: "redirect_to_index_page",
  environment: {
    // Pass in the API endpoint to our app
    VITE_APP_API_URL: api.url,
  }, 
});
```

### Environment variables

The `StaticSite` construct allows you to set the environment variables that are passed through your build system based on outputs from other constructs in your SST app. So you don't have to hard code the config from your backend.

You need to be using a build tool that supports setting build time environment variables (most do). For example, Create React App [supports this through webpack](https://create-react-app.dev/docs/adding-custom-environment-variables/). We'll use it as an example.

In your JS files this looks like:

```js title="src/App.js"
console.log(process.env.REACT_APP_API_URL);
console.log(process.env.REACT_APP_USER_POOL_CLIENT);
```

And in your HTML files:

```html title="public/index.html"
<p>Api endpoint is: %REACT_APP_API_URL%</p>
```

You can pass these in directly from the construct.

```js {3-6}
new StaticSite(stack, "ReactSite", {
  path: "path/to/src",
  environment: {
    REACT_APP_API_URL: api.url,
    REACT_APP_USER_POOL_CLIENT: auth.cognitoUserPoolClient.userPoolClientId,
  },
});
```

Where `api.url` or `auth.cognitoUserPoolClient.userPoolClientId` are coming from other constructs in your SST app.

#### While deploying

On `sst deploy`, the environment variables will first be replaced by placeholder values, `{{ REACT_APP_API_URL }}` and `{{ REACT_APP_USER_POOL_CLIENT }}`, when building the app. And after the referenced resources have been created, the Api and User Pool in this case, the placeholders in the HTML and JS files will then be replaced with the actual values.

#### While developing

To use these values while developing, run `sst start` to start the [Live Lambda Development](/live-lambda-development.md) environment.

```bash
npx sst start
```

Then in your app to reference these variables, add the [`sst-env`](/packages/static-site-env.md) package.

```bash
npm install --save-dev @serverless-stack/static-site-env
```

And tweak the `start` script to:

```json title="package.json" {2}
"scripts": {
  "start": "sst-env -- react-scripts start",
  "build": "react-scripts build",
  "test": "react-scripts test",
  "eject": "react-scripts eject"
},
```

Now you can start your app as usual and it'll have the environment variables from your SST app.

```bash
npm run start
```

There are a couple of things happening behind the scenes here:

1. The `sst start` command generates a file with the values specified by `StaticSite`'s `environment` prop.
2. The `sst-env` CLI will traverse up the directories to look for the root of your SST app.
3. It'll then find the file that's generated in step 1.
4. It'll load these as environment variables before running the start command.

:::note
`sst-env` only works if the app is located inside the SST app or inside one of its subdirectories. For example:

```
/
  sst.json
  react-app/
```

:::

### Custom domains

You can configure the website with a custom domain hosted either on [Route 53](https://aws.amazon.com/route53/) or [externally](#configuring-externally-hosted-domain).

#### Using the basic config (Route 53 domains)

```js {3}
new StaticSite(stack, "Site", {
  path: "path/to/src",
  customDomain: "domain.com",
});
```

#### Redirect www to non-www (Route 53 domains)

```js {3-6}
new StaticSite(stack, "Site", {
  path: "path/to/src",
  customDomain: {
    domainName: "domain.com",
    domainAlias: "www.domain.com",
  },
});
```

#### Configuring domains across stages (Route 53 domains)

```js {3-7}
new StaticSite(stack, "Site", {
  path: "path/to/src",
  customDomain: {
    domainName:
      scope.stage === "prod" ? "domain.com" : `${scope.stage}.domain.com`,
    domainAlias: scope.stage === "prod" ? "www.domain.com" : undefined,
  },
});
```

#### Using the full config (Route 53 domains)

```js {3-7}
new StaticSite(stack, "Site", {
  path: "path/to/src",
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

new StaticSite(stack, "Site", {
  path: "path/to/src",
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

new StaticSite(stack, "Site", {
  path: "path/to/src",
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

new StaticSite(stack, "Site", {
  path: "path/to/src",
  customDomain: {
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

### Caching

Configure the Cache Control settings based on different file types.

```js {6-17}
new StaticSite(stack, "Site", {
  path: "path/to/src",
  buildOutput: "build",
  buildCommand: "npm run build",
  errorPage: "redirect_to_index_page",
  fileOptions: [
    {
      exclude: "*",
      include: "*.html",
      cacheControl: "max-age=0,no-cache,no-store,must-revalidate",
    },
    {
      exclude: "*",
      include: ["*.js", "*.css"],
      cacheControl: "max-age=31536000,public,immutable",
    },
  ],
});
```

This configures all the `.html` files to not be cached by the, while the `.js` and `.css` files to be cached forever.

Note that, you need to specify the `exclude: "*"` along with the `include` option. It allows you to pick the files you want, while excluding everything else.

### Advanced examples

#### Configuring the S3 Bucket

Configure the internally created CDK `Bucket` instance.

```js {6-8}
import { RemovalPolicy } from "aws-cdk-lib";

new StaticSite(stack, "Site", {
  path: "path/to/src",
  cdk: {
    bucket: {
      removalPolicy: RemovalPolicy.DESTROY,
    },
  },
});
```

#### Using an existing S3 Bucket

```js {5-7}
import * as s3 from "aws-cdk-lib/aws-s3";

new StaticSite(stack, "Site", {
  path: "path/to/src",
  cdk: {
    bucket: s3.Bucket.fromBucketName(stack, "Bucket", "my-bucket"),
  },
});
```

#### Configuring the CloudFront Distribution

Configure the internally created CDK `Distribution` instance.

```js {4-6}
new StaticSite(stack, "Site", {
  path: "path/to/src",
  cdk: {
    distribution: {
      comment: "Distribution for my React website",
    },
  },
});
```

#### Configuring the CloudFront default behavior

The default behavior of the CloudFront distribution uses the internally created S3 bucket as the origin. You can configure this behavior.

```js {6-11}
import { ViewerProtocolPolicy, AllowedMethods } from "aws-cdk-lib/aws-cloudfront";

new StaticSite(stack, "Site", {
  path: "path/to/src",
  cdk: {
    distribution: {
      defaultBehavior: {
        viewerProtocolPolicy: ViewerProtocolPolicy.HTTPS_ONLY,
        allowedMethods: AllowedMethods.ALLOW_ALL,
      },
    },
  },
});
```

#### Using Lambda@Edge

```js {4-9,14-23}
import { Code, Runtime } from "aws-cdk-lib/aws-lambda";
import { LambdaEdgeEventType, experimental } from "aws-cdk-lib/aws-cloudfront";

const edgeFunc = new experimental.EdgeFunction(stack, "MyFunction", {
  runtime: Runtime.NODEJS_16_X,
  handler: "lambda.handler",
  code: Code.fromAsset("path/to/dir"),
  stackId: `${scope.logicalPrefixedName("edge-lambda")}`,
});

new StaticSite(stack, "Site", {
  path: "path/to/src",
  cdk: {
    distribution: {
      defaultBehavior: {
        edgeLambdas: [
          {
            functionVersion: edgeFunc.currentVersion,
            eventType: LambdaEdgeEventType.VIEWER_RESPONSE,
          },
        ],
      },
    },
  },
});
```

Note that, Lambda@Edge functions will be created in the `us-east-1` region, regardless of the region of your SST app. If the app is in `us-east-1`, the Lambda function is created directly in the stack. If the app is not in `us-east-1`, the Lambda function will be created in a new stack with the provided `stackId`. And the new stack will be deployed to `us-east-1`.

:::caution
On `sst remove`, the Lambda@Edge functions cannot be removed right away. CloudFront needs to remove the function replicas from the edge locations. This can take up to a few hours. If the stack fails to remove, simply wait for some time and retry.
:::
