---
description: "Docs for the sst.StaticSite construct in the @serverless-stack/resources package"
---

:::caution
This is the SST v0.x Constructs doc. SST v1 is now released. If you are using v1, see the [v1 Constructs doc](/constructs). If you are looking to upgrade to v1, [check out the migration steps](/constructs/v0/migration).
:::

The `StaticSite` construct is a higher level CDK construct that makes it easy to create a static website. It provides a simple way to build and deploy the site to an S3 bucket; setup a CloudFront CDN for fast content delivery; and configure a custom domain for the website URL. In addition:

- Visitors to the `http://` url will be redirected to the `https://` URL.
- If a [domain alias](#domainalias) is configured, visitors to the alias domain will be redirected to the main one. So if `www.example.com` is the domain alias for `example.com`, visitors to `www.example.com` will be redirected to `example.com`.

See the [examples](#examples) for more details.

## Initializer

```ts
new StaticSite(scope: Construct, id: string, props: StaticSiteProps)
```

_Parameters_

- scope [`Construct`](https://docs.aws.amazon.com/cdk/api/v2/docs/constructs.Construct.html)
- id `string`
- props [`StaticSiteProps`](#staticsiteprops)

## Examples

The `StaticSite` construct is designed to make it easy to get started with, while allowing for a way to fully configure it as well. Let's look at how, through a couple of examples.

### Creating a plain HTML site

Deploys a plain HTML website in the `path/to/src` directory.

```js
import { StaticSite } from "@serverless-stack/resources";

new StaticSite(this, "Site", {
  path: "path/to/src",
});
```

### Creating a React site

```js
import { StaticSiteErrorOptions } from "@serverless-stack/resources";

new StaticSite(this, "ReactSite", {
  path: "path/to/src",
  buildOutput: "build",
  buildCommand: "npm run build",
  errorPage: StaticSiteErrorOptions.REDIRECT_TO_INDEX_PAGE,
});
```

If you are using [Create React App](https://create-react-app.dev), we created the [`ReactStaticSite`](ReactStaticSite.md) construct to make it even easier to deploy React apps.

### Creating a Vue.js site

```js
new StaticSite(this, "VueJSSite", {
  path: "path/to/src",
  buildOutput: "dist",
  buildCommand: "npm run build",
  errorPage: StaticSiteErrorOptions.REDIRECT_TO_INDEX_PAGE,
});
```

### Creating a Gatsby site

```js
new StaticSite(this, "GatsbySite", {
  path: "path/to/src",
  errorPage: "404.html",
  buildOutput: "public",
  buildCommand: "npm run build",
});
```

### Creating a Jekyll site

```js
new StaticSite(this, "JekyllSite", {
  path: "path/to/src",
  errorPage: "404.html",
  buildOutput: "_site",
  buildCommand: "bundle exec jekyll build",
});
```

### Creating an Angular site

```js
new StaticSite(this, "AngularSite", {
  path: "path/to/src",
  buildOutput: "dist",
  buildCommand: "ng build --output-path dist",
  errorPage: StaticSiteErrorOptions.REDIRECT_TO_INDEX_PAGE,
});
```

### Creating a Svelte site

```js
new StaticSite(this, "SvelteSite", {
  path: "path/to/src",
  buildOutput: "dist",
  buildCommand: "npm run build",
  errorPage: StaticSiteErrorOptions.REDIRECT_TO_INDEX_PAGE,
  environment: {
    // Pass in the API endpoint to our app
    VITE_APP_API_URL: api.url,
  },
});
```

### Configuring environment variables

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
new StaticSite(this, "ReactSite", {
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

To use these values while developing, run `sst start` to start the [Live Lambda Development](../../live-lambda-development.md) environment.

```bash
npx sst start
```

Then in your app to reference these variables, add the [`sst-env`](../../packages/sst-env.md) package.

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

### Configuring custom domains

You can configure the website with a custom domain hosted either on [Route 53](https://aws.amazon.com/route53/) or [externally](#configuring-externally-hosted-domain).

#### Using the basic config (Route 53 domains)

```js {3}
new StaticSite(this, "Site", {
  path: "path/to/src",
  customDomain: "domain.com",
});
```

#### Redirect www to non-www (Route 53 domains)

```js {3-6}
new StaticSite(this, "Site", {
  path: "path/to/src",
  customDomain: {
    domainName: "domain.com",
    domainAlias: "www.domain.com",
  },
});
```

#### Configuring domains across stages (Route 53 domains)

```js {7-10}
export default class MyStack extends Stack {
  constructor(scope, id, props) {
    super(scope, id, props);

    new StaticSite(this, "Site", {
      path: "path/to/src",
      customDomain: {
        domainName:
          scope.stage === "prod" ? "domain.com" : `${scope.stage}.domain.com`,
        domainAlias: scope.stage === "prod" ? "www.domain.com" : undefined,
      },
    });
  }
}
```

#### Using the full config (Route 53 domains)

```js {3-7}
new StaticSite(this, "Site", {
  path: "path/to/src",
  customDomain: {
    domainName: "domain.com",
    domainAlias: "www.domain.com",
    hostedZone: "domain.com",
  },
});
```

#### Importing an existing certificate (Route 53 domains)

```js {7}
import { Certificate } from "aws-cdk-lib/aws-certificatemanager";

new StaticSite(this, "Site", {
  path: "path/to/src",
  customDomain: {
    domainName: "domain.com",
    certificate: Certificate.fromCertificateArn(this, "MyCert", certArn),
  },
});
```

Note that, the certificate needs be created in the `us-east-1`(N. Virginia) region as required by AWS CloudFront.

#### Specifying a hosted zone (Route 53 domains)

If you have multiple hosted zones for a given domain, you can choose the one you want to use to configure the domain.

```js {7-10}
import { HostedZone } from "aws-cdk-lib/aws-route53";

new StaticSite(this, "Site", {
  path: "path/to/src",
  customDomain: {
    domainName: "domain.com",
    hostedZone: HostedZone.fromHostedZoneAttributes(this, "MyZone", {
      hostedZoneId,
      zoneName,
    }),
  },
});
```

#### Configuring externally hosted domain

```js {5-9}
import { Certificate } from "aws-cdk-lib/aws-certificatemanager";

new StaticSite(this, "Site", {
  path: "path/to/src",
  customDomain: {
    isExternalDomain: true,
    domainName: "domain.com",
    certificate: Certificate.fromCertificateArn(this, "MyCert", certArn),
  },
});
```

Note that the certificate needs be created in the `us-east-1`(N. Virginia) region as required by AWS CloudFront, and validated. After the `Distribution` has been created, create a CNAME DNS record for your domain name with the `Distribution's` URL as the value. Here are more details on [configuring SSL Certificate on externally hosted domains](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/CNAMEs.html).

Also note that you can also migrate externally hosted domains to Route 53 by [following this guide](https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/MigratingDNS.html).

### Configure caching

Configure the Cache Control settings based on different file types.

```js {6-17}
new StaticSite(this, "Site", {
  path: "path/to/src",
  buildOutput: "build",
  buildCommand: "npm run build",
  errorPage: StaticSiteErrorOptions.REDIRECT_TO_INDEX_PAGE,
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

### Replace deployed values

Replace placeholder values in your website content with the deployed values. So you don't have to hard code the config from your backend.

```js {6-17}
new StaticSite(this, "ReactSite", {
  path: "path/to/src",
  buildOutput: "build",
  buildCommand: "npm run build",
  errorPage: StaticSiteErrorOptions.REDIRECT_TO_INDEX_PAGE,
  replaceValues: [
    {
      files: "**/*.js",
      search: "{{ API_URL }}",
      replace: api.url,
    },
    {
      files: "**/*.js",
      search: "{{ COGNITO_USER_POOL_CLIENT_ID }}",
      replace: auth.cognitoUserPoolClient.userPoolClientId,
    },
  ],
});
```

This replaces `{{ API_URL }}` and `{{ COGNITO_USER_POOL_CLIENT_ID }}` with the deployed API endpoint and Cognito User Pool Client Id in all the `.js` files in your React app.

### Configuring the S3 Bucket

Configure the internally created CDK `Bucket` instance.

```js {5-7}
import { RemovalPolicy } from "aws-cdk-lib";

new StaticSite(this, "Site", {
  path: "path/to/src",
  s3Bucket: {
    removalPolicy: RemovalPolicy.DESTROY,
  },
});
```

### Configuring the CloudFront Distribution

Configure the internally created CDK `Distribution` instance.

```js {3-5}
new StaticSite(this, "Site", {
  path: "path/to/src",
  cfDistribution: {
    comment: "Distribution for my React website",
  },
});
```

### Configuring the CloudFront default behavior

The default behavior of the CloudFront distribution uses the internally created S3 bucket as the origin. You can configure this behavior.

```js {6-9}
import {
  ViewerProtocolPolicy,
  AllowedMethods,
} from "aws-cdk-lib/aws-cloudfront";

new StaticSite(this, "Site", {
  path: "path/to/src",
  cfDistribution: {
    defaultBehavior: {
      viewerProtocolPolicy: ViewerProtocolPolicy.HTTPS_ONLY,
      allowedMethods: AllowedMethods.ALLOW_ALL,
    },
  },
});
```

### Using Lambda@Edge

```js {3-8,14-19}
import { LambdaEdgeEventType, experimental } from "aws-cdk-lib/aws-cloudfront";

const edgeFunc = new experimental.EdgeFunction(this, "MyFunction", {
  runtime: lambda.Runtime.NODEJS_12_X,
  handler: "lambda.handler",
  code: lambda.Code.fromAsset("path/to/dir"),
  stackId: `${scope.logicalPrefixedName("edge-lambda")}`,
});

new StaticSite(this, "Site", {
  path: "path/to/src",
  cfDistribution: {
    defaultBehavior: {
      edgeLambdas: [
        {
          functionVersion: edgeFunc.currentVersion,
          eventType: LambdaEdgeEventType.VIEWER_RESPONSE,
        },
      ],
    },
  },
});
```

Note that, Lambda@Edge functions will be created in the `us-east-1` region, regardless of the region of your SST app. If the app is in `us-east-1`, the Lambda function is created directly in the stack. If the app is not in `us-east-1`, the Lambda function will be created in a new stack with the provided `stackId`. And the new stack will be deployed to `us-east-1`.

:::caution
On `sst remove`, the Lambda@Edge functions cannot be removed right away. CloudFront needs to remove the function replicas from the edge locations. This can take up to a few hours. If the stack fails to remove, simply wait for some time and retry.
:::

## Properties

An instance of `StaticSite` contains the following properties.

### url

_Type_: `string`

The CloudFront URL of the website.

### customDomainUrl?

_Type_: `string`

If the custom domain is enabled, this is the URL of the website with the custom domain.

### bucketArn

_Type_: `string`

The ARN of the internally created CDK `Bucket` instance.

### bucketName

_Type_: `string`

The name of the internally created CDK `Bucket` instance.

### distributionId

_Type_: `string`

The ID of the internally created CDK `Distribution` instance.

### distributionDomain

_Type_: `string`

The domain name of the internally created CDK `Distribution` instance.

### s3Bucket

_Type_ : [`cdk.aws-s3.Bucket`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_s3.Bucket.html)

The internally created CDK `Bucket` instance.

### cfDistribution

_Type_ : [`cdk.aws-cloudfront.Distribution`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_cloudfront.Distribution.html)

The internally created CDK `Distribution` instance.

### hostedZone?

_Type_ : [`cdk.aws-route53.IHostedZone`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_route53.IHostedZone.html)

The Route 53 hosted zone for the custom domain.

### acmCertificate?

_Type_ : [`cdk.aws-certificatemanager.ICertificate`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_certificatemanager.ICertificate.html)

The AWS Certificate Manager certificate for the custom domain.

## StaticSiteProps

### path

_Type_ : `string`

Path to the directory where the website source is located.

### indexPage?

_Type_ : `string`, _defaults to_ `index.html`

The name of the index page (e.g. "index.html") of the website.

### errorPage?

_Type_ : `string | StaticSiteErrorOptions`

The error page behavior for this website. Takes either an HTML page.

```
404.html
```

Or the [StaticSiteErrorOptions](#staticsiteerroroptions) to redirect to the index page.

```
StaticSiteErrorOptions.REDIRECT_TO_INDEX_PAGE
```

Note that, if the error pages are redirected to the index page, the HTTP status code is set to 200. This is necessary for single page apps, that handle 404 pages on the client side.

### buildCommand?

_Type_ : `string`, _defaults to no build command_

The command for building the website (e.g. "npm run build").

### buildOutput?

_Type_ : `string`, _defaults to the path_

The directory with the content that will be uploaded to the S3 bucket. If a `buildCommand` is provided, this is usually where the build output is generated. The path is relative to the [`path`](#path) where the website source is located.

### customDomain?

_Type_ : `string | StaticSiteDomainProps`

The customDomain for this website. SST supports domains that are hosted either on [Route 53](https://aws.amazon.com/route53/) or externally.

Note that you can also migrate externally hosted domains to Route 53 by [following this guide](https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/MigratingDNS.html).

Takes either the domain as a string.

```
"domain.com"
```

Or the [StaticSiteDomainProps](#staticsitedomainprops).

```js
{
  domainName: "domain.com",
  domainAlias: "www.domain.com",
  hostedZone: "domain.com",
}
```

### fileOptions?

_Type_ : [`StaticSiteDomainProps`](#staticsitefileoption)[]

Pass in a list of file options to configure cache control for different files. Behind the scenes, the `StaticSite` construct uses a combination of the `s3 cp` and `s3 sync` commands to upload the website content to the S3 bucket. An `s3 cp` command is run for each file option block, and the options are passed in as the command options.

For example, the follow configuration:

```js
{
  exclude: "*",
  include: "*.js",
  cacheControl: "max-age=31536000,public,immutable",
}
```

runs the `s3 cp` commands:

```bash
s3 cp CONTENT_DIR s3://BUCKET_NAME/deploy-2021-06-21T06:05:37.720Z --recursive --exclude * --include *.js --cache-control max-age=31536000,public,immutable
```

After the `s3 cp` commands are run, the construct will run an `s3 sync` command to upload all files not explicitely configured in `fileOptions`.

### environment?

_Type_ : `{ [key: string]: string }`

An associative array with the key being the environment variable name. Note, this requires your build tool to support build time environment variables.

```js
{
  REACT_APP_API_URL: api.url;
}
```

### replaceValues?

_Type_ : [`StaticSiteReplaceProps`](#staticsitereplaceprops)[]

Pass in a list of placeholder values to be replaced in the website content. For example, the follow configuration:

```js
{
  files: "*.js",
  search: "{{ API_URL }}",
  replace: api.url,
}
```

Replaces `{{ API_URL }}` with the deployed API url in all the `.js` files.

### s3Bucket?

_Type_: [`cdk.aws-s3.BucketProps`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_s3.BucketProps.html)

Pass in a `cdk.aws-s3.BucketProps` value to override the default settings this construct uses to create the CDK `Bucket` internally.

### cfDistribution?

_Type_: [`StaticSiteCdkDistributionProps`](#staticsitecdkdistributionprops)

Pass in a `StaticSiteCdkDistributionProps` value to override the default settings this construct uses to create the CDK `Distribution` internally.

### purgeFiles?

_Type_ : `boolean`, _defaults to true_

While deploying, SST removes old files that no longer exist. Pass in `false` to keep the old files around.

### waitForInvalidation?

_Type_ : `boolean`, _defaults to true_

While deploying, SST waits for the CloudFront cache invalidation process to finish. This ensures that the new content will be served once the deploy command finishes. However, this process can sometimes take more than 5 mins. For non-prod environments it might make sense to pass in `false`. That'll skip waiting for the cache to invalidate and speed up the deploy process.

### disablePlaceholder?

_Type_ : `boolean`, _defaults to false_

When running `sst start`, a placeholder site is deployed. This is to ensure that the site content remains unchanged, and subsequent `sst start` can start up quickly.

## StaticSiteDomainProps

### domainName

_Type_ : `string`

The domain to be assigned to the website URL (ie. `domain.com`).

Supports domains that are hosted either on [Route 53](https://aws.amazon.com/route53/) or externally.

### domainAlias?

_Type_ : `string`, _defaults to no alias configured_

An alternative domain to be assigned to the website URL. Visitors to the alias will be redirected to the main domain. (ie. `www.domain.com`).

Use this to create a `www.` version of your domain and redirect visitors to the root domain.

### hostedZone?

_Type_ : `string | cdk.aws-route53.IHostedZone`, _defaults to the domain name_

The hosted zone in Route 53 that contains the domain. Takes the name of the hosted zone as a `string` or the hosted zone construct [`cdk.aws-route53.HostedZone`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_route53.HostedZone.html). By default, SST will look for a hosted zone matching the `domainName` that's passed in.

Set this option if SST cannot find the hosted zone in Route 53.

### certificate?

_Type_ : [`cdk.aws-certificatemanager.ICertificate`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_certificatemanager.ICertificate.html), _defaults to `undefined`_

The certificate for the domain. By default, SST will create a certificate with the domain name from the `domainName` option. The certificate will be created in the `us-east-1`(N. Virginia) region as required by AWS CloudFront.

Set this option if you have an existing certificate in the `us-east-1` region in AWS Certificate Manager you want to use.

### alternateNames?

_Type_ : `string[]`, _defaults to `[]`_

Specify additional names that should route to the Cloudfront Distribution. Note, certificates for these names will not be automatically generated so the `certificate` option must be specified.

### isExternalDomain?

_Type_ : `boolean`, _defaults to `false`_

Set this option if the domain is not hosted on Amazon Route 53.

## StaticSiteFileOption

### exclude

_Type_ : `string | string[]`

Exclude all files that matches the given pattern.

### include

_Type_ : `string | string[]`

Don't exclude files that match the given pattern.

### cacheControl

_Type_ : `string`

Specifies caching behavior for the included files.

## StaticSiteReplaceProps

### files

_Type_ : `string`

The glob pattern of all files to be searched.

### search

_Type_ : `string`

A string that is to be replaced by the `replace` prop. Note that this isn't a regular expression. And all the occurrences will be replaced.

### replace

_Type_ : `string`

The string that replaces the substring specified by the specified `search` prop.

## StaticSiteCdkDistributionProps

`StaticSiteCdkDistributionProps` extends [`cdk.aws-cloudfront.DistributionProps`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_cloudfront.DistributionProps.html) with the exception that the `defaultBehavior` field is **optional** and takes a [`cdk.aws-cloudfront.AddBehaviorOptions`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_cloudfront.AddBehaviorOptions.html) object.

You can use `StaticSiteCdkDistributionProps` to configure the CloudFront distribution properties.

## StaticSiteErrorOptions

An enum with the following members representing the field types.

| Member                 | Description                                  |
| ---------------------- | -------------------------------------------- |
| REDIRECT_TO_INDEX_PAGE | Redirect any invalid url to the `indexPage`. |
