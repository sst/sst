---
description: "Docs for the sst.ViteStaticSite construct in the @serverless-stack/resources package"
---
<!--
!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
!!                                                           !!
!!  This file has been automatically generated, do not edit  !!
!!                                                           !!
!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
-->


## Constructor
```ts
new ViteStaticSite(scope: Construct, id: string, props: ViteStaticSiteProps)
```
_Parameters_
- __scope__ [`Construct`](https://docs.aws.amazon.com/cdk/api/v2/docs/constructs.Construct.html)
- __id__ `string`
- __props__ [`ViteStaticSiteProps`](#vitestaticsiteprops)
## Properties
An instance of `ViteStaticSite` has the following properties.
### bucketArn

_Type_ : `string`

The ARN of the internally created CDK `Bucket` instance.

### bucketName

_Type_ : `string`

The name of the internally created CDK `Bucket` instance.


### cdk.bucket

_Type_ : [`Bucket`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.Bucket.html)

The internally created CDK `Bucket` instance.

### cdk.certificate?

_Type_ : [`ICertificate`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.ICertificate.html)

### cdk.distribution

_Type_ : [`Distribution`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.Distribution.html)

The internally created CDK `Distribution` instance.

### cdk.hostedZone?

_Type_ : [`IHostedZone`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.IHostedZone.html)

The Route 53 hosted zone for the custom domain.


### customDomainUrl

_Type_ : `undefined`&nbsp; | &nbsp;`string`

If the custom domain is enabled, this is the URL of the website with the custom domain.

### distributionDomain

_Type_ : `string`

The domain name of the internally created CDK `Distribution` instance.

### distributionId

_Type_ : `string`

The ID of the internally created CDK `Distribution` instance.

### url

_Type_ : `string`

The CloudFront URL of the website.

## Methods
An instance of `ViteStaticSite` has the following methods.
### getConstructMetadata

```ts
getConstructMetadata(undefined)
```
## ViteStaticSiteProps


### buildCommand?

_Type_ : `string`

The command for building the website (e.g. "npm run build").

### buildOutput?

_Type_ : `string`

The directory with the content that will be uploaded to the S3 bucket. If a `buildCommand` is provided, this is usually where the build output is generated. The path is relative to the [`path`](#path) where the website source is located.


### cdk.bucket?

_Type_ : [`BucketProps`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.BucketProps.html)

Pass in a bucket configuration to override the default settings this construct uses to create the CDK `Bucket` internally.

#### Examples

### Configuring the S3 Bucket

Configure the internally created CDK `Bucket` instance.

```js {6-8}
import { RemovalPolicy } from "aws-cdk-lib";

new StaticSite(this, "Site", {
  path: "path/to/src",
  cdk: {
    bucket: {
      removalPolicy: RemovalPolicy.DESTROY,
    },
  }
});
```

### Configuring the CloudFront Distribution

Configure the internally created CDK `Distribution` instance.

```js {3-5}
new StaticSite(this, "Site", {
  path: "path/to/src",
  cdk: {
    distribution: {
      comment: "Distribution for my React website",
    },
  }
});
```

### Configuring the CloudFront default behavior

The default behavior of the CloudFront distribution uses the internally created S3 bucket as the origin. You can configure this behavior.

```js {6-9}
import { ViewerProtocolPolicy, AllowedMethods } from "aws-cdk-lib/aws-cloudfront";

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

### cdk.distribution?

_Type_ : [`BaseSiteCdkDistributionProps`](BaseSiteCdkDistributionProps)


### customDomain?

_Type_ : `string`&nbsp; | &nbsp;[`BaseSiteDomainProps`](BaseSiteDomainProps)

The customDomain for this website. SST supports domains that are hosted either on [Route 53](https://aws.amazon.com/route53/) or externally.
Note that you can also migrate externally hosted domains to Route 53 by [following this guide](https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/MigratingDNS.html).

#### Examples

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


### disablePlaceholder?

_Type_ : `boolean`

When running `sst start`, a placeholder site is deployed. This is to ensure that the site content remains unchanged, and subsequent `sst start` can start up quickly.




An object with the key being the environment variable name. Note, this requires your build tool to support build time environment variables.

#### Examples

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

To use these values while developing, run `sst start` to start the [Live Lambda Development](../live-lambda-development.md) environment.

```bash
npx sst start
```

Then in your app to reference these variables, add the [`sst-env`](../packages/static-site-env.md) package.

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

### errorPage?

_Type_ : `string`

The error page behavior for this website. Takes either an HTML page.
```
404.html
```
Or the constant "redirect_to_index_page" to redirect to the index page.
Note that, if the error pages are redirected to the index page, the HTTP status code is set to 200. This is necessary for single page apps, that handle 404 pages on the client side.

### fileOptions?

_Type_ : 
### fileOptions.cacheControl

_Type_ : `string`



#### Examples

### Configure caching

Configure the Cache Control settings based on different file types.

```js {6-17}
new StaticSite(this, "Site", {
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

### fileOptions.exclude

_Type_ : `string`&nbsp; | &nbsp;`string`

### fileOptions.include

_Type_ : `string`&nbsp; | &nbsp;`string`


Pass in a list of file options to configure cache control for different files. Behind the scenes, the `StaticSite` construct uses a combination of the `s3 cp` and `s3 sync` commands to upload the website content to the S3 bucket. An `s3 cp` command is run for each file option block, and the options are passed in as the command options.

#### Examples


### Configuring fileOptions
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

### indexPage?

_Type_ : `string`

The name of the index page (e.g. "index.html") of the website.

### path

_Type_ : `string`

Path to the directory where the website source is located.

### purgeFiles?

_Type_ : `boolean`

While deploying, SST removes old files that no longer exist. Pass in `false` to keep the old files around.

### replaceValues?

_Type_ : [`BaseSiteReplaceProps`](BaseSiteReplaceProps)

Pass in a list of placeholder values to be replaced in the website content. For example, the follow configuration:

#### Examples

### Replace deployed values

Replace placeholder values in your website content with the deployed values. So you don't have to hard code the config from your backend.

```js {6-17}
new StaticSite(this, "ReactSite", {
  path: "path/to/src",
  buildOutput: "build",
  buildCommand: "npm run build",
  errorPage: "redirect_to_index_page",
  replaceValues: [
    {
      files: "*.js",
      search: "{{ API_URL }}",
      replace: api.url,
    },
    {
      files: "*.js",
      search: "{{ COGNITO_USER_POOL_CLIENT_ID }}",
      replace: auth.cognitoUserPoolClient.userPoolClientId,
    },
  ],
});
```

This replaces `{{ API_URL }}` and `{{ COGNITO_USER_POOL_CLIENT_ID }}` with the deployed API endpoint and Cognito User Pool Client Id in all the `.js` files in your React app.

### typesPath?

_Type_ : `string`

### waitForInvalidation?

_Type_ : `boolean`

While deploying, SST waits for the CloudFront cache invalidation process to finish. This ensures that the new content will be served once the deploy command finishes. However, this process can sometimes take more than 5 mins. For non-prod environments it might make sense to pass in `false`. That'll skip waiting for the cache to invalidate and speed up the deploy process.
