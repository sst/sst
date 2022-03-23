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
The `ViteStaticSite` construct is a higher level CDK construct that makes it easy to create a Vite single page app. It provides a simple way to build and deploy the site to an S3 bucket; setup a CloudFront CDN for fast content delivery; and configure a custom domain for the website URL.

It's designed to work with static sites built with [Vite](https://vitejs.dev/). It allows you to [automatically set environment variables](#configuring-environment-variables) in your Vite app directly from the outputs of your SST app. And it can also create a `.d.ts` type definition file for the environment variables.

The `ViteStaticSite` construct internally extends the [`StaticSite`](StaticSite.md) construct with the following pre-configured defaults.

- [`indexPage`](StaticSite.md#indexpage) is set to `index.html`.
- [`errorPage`](StaticSite.md#errorpage) is set to `redirect_to_index_page`. So error pages are redirected to the index page.
- [`buildCommand`](StaticSite.md#buildcommand) is `npm run build`.
- [`buildOutput`](StaticSite.md#buildoutput) is the `dist` folder in your Vite app.
- [`fileOptions`](StaticSite.md#fileoptions) sets the cache control to `max-age=0,no-cache,no-store,must-revalidate` for HTML files; and `max-age=31536000,public,immutable` for JS/CSS files.


## Constructor
```ts
new ViteStaticSite(scope: Construct, id: string, props: ViteStaticSiteProps)
```
_Parameters_
- __scope__ [`Construct`](https://docs.aws.amazon.com/cdk/api/v2/docs/constructs.Construct.html)
- __id__ `string`
- __props__ [`ViteStaticSiteProps`](#vitestaticsiteprops)

## Examples


```js
new ViteStaticSite(this, "Site", {
  path: "path/to/src",
});
```

## Properties
An instance of `ViteStaticSite` has the following properties.
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


## Methods
An instance of `ViteStaticSite` has the following methods.
### getConstructMetadata

```ts
getConstructMetadata(undefined)
```
## ViteStaticSiteProps


### buildCommand?

_Type_ : `string`

The command for building the website

#### Examples

```js
new ViteStaticSite(this, "Site", {
  buildCommand: "npm run build",
});
```

### buildOutput?

_Type_ : `string`

The directory with the content that will be uploaded to the S3 bucket. If a `buildCommand` is provided, this is usually where the build output is generated. The path is relative to the [`path`](#path) where the website source is located.

#### Examples

```js
new ViteStaticSite(this, "Site", {
  buildOutput: "dist",
});
```

### customDomain?

_Type_ : `string`&nbsp; | &nbsp;[`StaticSiteDomainProps`](StaticSiteDomainProps)

The customDomain for this website. SST supports domains that are hosted either on [Route 53](https://aws.amazon.com/route53/) or externally.
Note that you can also migrate externally hosted domains to Route 53 by [following this guide](https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/MigratingDNS.html).

#### Examples

```js
new ViteStaticSite(this, "Site", {
  path: "path/to/src",
  customDomain: "domain.com",
});
```


```js
new ViteStaticSite(this, "Site", {
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
new ViteStaticSite(this, "ReactSite", {
 disablePlaceholder: true
});
```

### environment?

_Type_ : Record<`string`, `string`>

An object with the key being the environment variable name. Note, this requires your build tool to support build time environment variables.

#### Examples

```js
new ViteStaticSite(this, "ReactSite", {
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
new ViteStaticSite(this, "Site", {
  errorPage: "redirect_to_index_page",
});
```

### fileOptions?

_Type_ : Array< [`StaticSiteFileOptions`](StaticSiteFileOptions) >

Pass in a list of file options to configure cache control for different files. Behind the scenes, the `StaticSite` construct uses a combination of the `s3 cp` and `s3 sync` commands to upload the website content to the S3 bucket. An `s3 cp` command is run for each file option block, and the options are passed in as the command options.

#### Examples

```js
new ViteStaticSite(this, "Site", {
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
new ViteStaticSite(this, "Site", {
  indexPage: "other-index.html",
});
```

### path

_Type_ : `string`

Path to the directory where the website source is located.

#### Examples

```js
new ViteStaticSite(this, "Site", {
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
new ViteStaticSite(this, "ReactSite", {
 purge: false
});
```

### replaceValues?

_Type_ : Array< [`BaseSiteReplaceProps`](BaseSiteReplaceProps) >

Pass in a list of placeholder values to be replaced in the website content. For example, the follow configuration:

#### Examples

```js
new ViteStaticSite(this, "ReactSite", {
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

### typesPath?

_Type_ : `string`

_Default_ : `"src/sst-env.d.ts"`

The path where code-gen should place the type definition for environment variables

#### Examples

```js
new ViteStaticSite(props.stack, "Site", {
  typesFile: "./other/path/sst-env.d.ts",
})
```

### waitForInvalidation?

_Type_ : `boolean`

_Default_ : `true
`

While deploying, SST waits for the CloudFront cache invalidation process to finish. This ensures that the new content will be served once the deploy command finishes. However, this process can sometimes take more than 5 mins. For non-prod environments it might make sense to pass in `false`. That'll skip waiting for the cache to invalidate and speed up the deploy process.

#### Examples

```js
new ViteStaticSite(this, "ReactSite", {
 waitForInvalidation: false
});
```


### cdk.bucket?

_Type_ : [`BucketProps`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.BucketProps.html)

Pass in a bucket configuration to override the default settings this construct uses to create the CDK `Bucket` internally.

#### Examples

```js
new ViteStaticSite(this, "Site", {
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
new ViteStaticSite(this, "Site", {
  path: "path/to/src",
  cdk: {
    distribution: {
      comment: "Distribution for my React website",
    },
  }
});
```

