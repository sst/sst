---
description: "Docs for the sst.StaticSite construct in the @serverless-stack/resources package"
---
<!--
!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
!!                                                           !!
!!  This file has been automatically generated, do not edit  !!
!!                                                           !!
!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
-->
The `StaticSite` construct is a higher level CDK construct that makes it easy to create a static website. It provides a simple way to build and deploy the site to an S3 bucket; setup a CloudFront CDN for fast content delivery; and configure a custom domain for the website URL. In addition:

- Visitors to the `http://` url will be redirected to the `https://` URL.
- If a [domain alias](#domainalias) is configured, visitors to the alias domain will be redirected to the main one. So if `www.example.com` is the domain alias for `example.com`, visitors to `www.example.com` will be redirected to `example.com`.


## Constructor
```ts
new StaticSite(scope: Construct, id: string, props: StaticSiteProps)
```
_Parameters_
- __scope__ [`Construct`](https://docs.aws.amazon.com/cdk/api/v2/docs/constructs.Construct.html)
- __id__ `string`
- __props__ [`StaticSiteProps`](#staticsiteprops)

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

## Properties
An instance of `StaticSite` has the following properties.
### bucketArn

_Type_ : `string`

The ARN of the internally created CDK `Bucket` instance.

### bucketName

_Type_ : `string`

The name of the internally created CDK `Bucket` instance.

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


## StaticSiteProps


### buildCommand?

_Type_ : `string`

The command for building the website

#### Examples

```js
new StaticSite(this, "Site", {
  buildCommand: "npm run build",
});
```

### buildOutput?

_Type_ : `string`

The directory with the content that will be uploaded to the S3 bucket. If a `buildCommand` is provided, this is usually where the build output is generated. The path is relative to the [`path`](#path) where the website source is located.

#### Examples

```js
new StaticSite(this, "Site", {
  buildOutput: "dist",
});
```

### customDomain?

_Type_ : `string`&nbsp; | &nbsp;[`StaticSiteDomainProps`](#staticsitedomainprops)

The customDomain for this website. SST supports domains that are hosted either on [Route 53](https://aws.amazon.com/route53/) or externally.
Note that you can also migrate externally hosted domains to Route 53 by [following this guide](https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/MigratingDNS.html).

#### Examples

```js
new StaticSite(this, "Site", {
  path: "path/to/src",
  customDomain: "domain.com",
});
```


```js
new StaticSite(this, "Site", {
  path: "path/to/src",
  customDomain: {
    domainName: "api.domain.com",
    hostedZone: "domain.com"
  }
});
```

### disablePlaceholder?

_Type_ : `boolean`

_Default_ : `false
`

When running `sst start`, a placeholder site is deployed. This is to ensure that the site content remains unchanged, and subsequent `sst start` can start up quickly.

#### Examples

```js
new StaticSite(this, "ReactSite", {
 disablePlaceholder: true
});
```

### environment?

_Type_ : Record<`string`, `string`>

An object with the key being the environment variable name. Note, this requires your build tool to support build time environment variables.

#### Examples

```js
new StaticSite(this, "ReactSite", {
  environment: {
    REACT_APP_API_URL: api.url,
    REACT_APP_USER_POOL_CLIENT: auth.cognitoUserPoolClient.userPoolClientId,
  },
});
```

### errorPage?

_Type_ : `string`

The error page behavior for this website. Takes either an HTML page.
```
404.html
```
Or the constant `"redirect_to_index_page"` to redirect to the index page.
Note that, if the error pages are redirected to the index page, the HTTP status code is set to 200. This is necessary for single page apps, that handle 404 pages on the client side.

#### Examples

```js
new StaticSite(this, "Site", {
  errorPage: "redirect_to_index_page",
});
```

### fileOptions?

_Type_ : Array< [`StaticSiteFileOptions`](#staticsitefileoptions) >

Pass in a list of file options to configure cache control for different files. Behind the scenes, the `StaticSite` construct uses a combination of the `s3 cp` and `s3 sync` commands to upload the website content to the S3 bucket. An `s3 cp` command is run for each file option block, and the options are passed in as the command options.

#### Examples

```js
new StaticSite(this, "Site", {
  buildOutput: "dist",
  fileOptions: {
    exclude: "*",
    include: "*.js",
    cacheControl: "max-age=31536000,public,immutable",
  }
});
```

### indexPage?

_Type_ : `string`

_Default_ : `"index.html"
`

The name of the index page (e.g. "index.html") of the website.

#### Examples

```js
new StaticSite(this, "Site", {
  indexPage: "other-index.html",
});
```

### path

_Type_ : `string`

Path to the directory where the website source is located.

#### Examples

```js
new StaticSite(this, "Site", {
  path: "path/to/src",
});
```

### purgeFiles?

_Type_ : `boolean`

_Default_ : `true
`

While deploying, SST removes old files that no longer exist. Pass in `false` to keep the old files around.

#### Examples

```js
new StaticSite(this, "ReactSite", {
 purge: false
});
```

### replaceValues?

_Type_ : Array< [`BaseSiteReplaceProps`](BaseSiteReplaceProps) >

Pass in a list of placeholder values to be replaced in the website content. For example, the follow configuration:

#### Examples

```js
new StaticSite(this, "ReactSite", {
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

### waitForInvalidation?

_Type_ : `boolean`

_Default_ : `true
`

While deploying, SST waits for the CloudFront cache invalidation process to finish. This ensures that the new content will be served once the deploy command finishes. However, this process can sometimes take more than 5 mins. For non-prod environments it might make sense to pass in `false`. That'll skip waiting for the cache to invalidate and speed up the deploy process.

#### Examples

```js
new StaticSite(this, "ReactSite", {
 waitForInvalidation: false
});
```


### cdk.bucket?

_Type_ : [`BucketProps`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.BucketProps.html)

Pass in a bucket configuration to override the default settings this construct uses to create the CDK `Bucket` internally.

#### Examples

```js
new StaticSite(this, "Site", {
  path: "path/to/src",
  cdk: {
    bucket: {
      bucketName: "mybucket",
    },
  }
});
```

### cdk.distribution?

_Type_ : [`BaseSiteCdkDistributionProps`](BaseSiteCdkDistributionProps)

Configure the internally created CDK `Distribution` instance.

#### Examples

```js
new StaticSite(this, "Site", {
  path: "path/to/src",
  cdk: {
    distribution: {
      comment: "Distribution for my React website",
    },
  }
});
```


## StaticSiteDomainProps
Used to configure StaticSite domain properties

### alternateNames?

_Type_ : Array< `string` >

Additional domain names for the site. Note the certificate must cover these domains

### domainAlias?

_Type_ : `string`

The domain alias of the site.

### domainName

_Type_ : `string`

The domain name of the site.

### hostedZone?

_Type_ : `string`

The hosted zone to use for the domain.

### isExternalDomain?

_Type_ : `boolean`

Is hosted outside of AWS


### cdk.certificate?

_Type_ : [`ICertificate`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.ICertificate.html)

### cdk.hostedZone?

_Type_ : [`IHostedZone`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.IHostedZone.html)


## StaticSiteFileOptions


### cacheControl

_Type_ : `string`

### exclude

_Type_ : `string`&nbsp; | &nbsp;Array< `string` >

### include

_Type_ : `string`&nbsp; | &nbsp;Array< `string` >
