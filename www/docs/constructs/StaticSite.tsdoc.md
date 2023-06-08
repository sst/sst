<!--
!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
!!                                                           !!
!!  This file has been automatically generated, do not edit  !!
!!                                                           !!
!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
-->

## Constructor
```ts
new StaticSite(scope, id, props)
```
_Parameters_
- __scope__ <span class="mono">[Construct](https://docs.aws.amazon.com/cdk/api/v2/docs/constructs.Construct.html)</span>
- __id__ <span class="mono">string</span>
- __props__ <span class="mono">[StaticSiteProps](#staticsiteprops)</span>
## StaticSiteProps
### buildCommand?

_Type_ : <span class="mono">string</span>

The command for building the website
```js
new StaticSite(stack, "Site", {
  buildCommand: "npm run build",
});
```
### buildOutput?

_Type_ : <span class="mono">string</span>

The directory with the content that will be uploaded to the S3 bucket. If a 
`buildCommand`
 is provided, this is usually where the build output is generated. The path is relative to the [
`path`
](#path) where the website source is located.
```js
new StaticSite(stack, "Site", {
  buildOutput: "build",
});
```
### customDomain?

_Type_ : <span class="mono">string</span><span class='mono'> | </span><span class="mono">[StaticSiteDomainProps](#staticsitedomainprops)</span>

The customDomain for this website. SST supports domains that are hosted either on [Route 53](https://aws.amazon.com/route53/) or externally.

Note that you can also migrate externally hosted domains to Route 53 by [following this guide](https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/MigratingDNS.html).
```js
new StaticSite(stack, "frontend", {
  path: "path/to/src",
  customDomain: "domain.com",
});
```
```js
new StaticSite(stack, "frontend", {
  path: "path/to/src",
  customDomain: {
    domainName: "domain.com",
    domainAlias: "www.domain.com",
    hostedZone: "domain.com"
  }
});
```

### dev.deploy?

_Type_ : <span class="mono">boolean</span>

When running 
`sst dev, site is not deployed. This is to ensure `
sst dev` can start up quickly.
```js
new StaticSite(stack, "frontend", {
 dev: {
   deploy: true
 }
});
```
### dev.url?

_Type_ : <span class="mono">string</span>

The local site URL when running 
`sst dev`
.
```js
new StaticSite(stack, "frontend", {
 dev: {
   url: "http://localhost:3000"
 }
});
```

### environment?

_Type_ : <span class="mono">Record&lt;<span class="mono">string</span>, <span class="mono">string</span>&gt;</span>

An object with the key being the environment variable name. Note, this requires your build tool to support build time environment variables.
```js
new StaticSite(stack, "frontend", {
  environment: {
    REACT_APP_API_URL: api.url,
    REACT_APP_USER_POOL_CLIENT: auth.cognitoUserPoolClient.userPoolClientId,
  },
});
```
### errorPage?

_Type_ : <span class="mono">"redirect_to_index_page"</span><span class='mono'> | </span><span class="mono">Omit&lt;<span class="mono">string</span>, <span class="mono">"redirect_to_index_page"</span>&gt;</span>

The error page behavior for this website. Takes either an HTML page.

```
404.html
```

Or the constant 
`"redirect_to_index_page"`
 to redirect to the index page.

Note that, if the error pages are redirected to the index page, the HTTP status code is set to 200. This is necessary for single page apps, that handle 404 pages on the client side.
```js
new StaticSite(stack, "Site", {
  errorPage: "redirect_to_index_page",
});
```
### fileOptions?

_Type_ : <span class='mono'>Array&lt;<span class="mono">[StaticSiteFileOptions](#staticsitefileoptions)</span>&gt;</span>

Pass in a list of file options to configure cache control for different files. Behind the scenes, the 
`StaticSite`
 construct uses a combination of the 
`s3 cp`
 and 
`s3 sync`
 commands to upload the website content to the S3 bucket. An 
`s3 cp`
 command is run for each file option block, and the options are passed in as the command options.

Defaults to no cache control for HTML files, and a 1 year cache control for JS/CSS files.

```js
[
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
]
```
```js
new StaticSite(stack, "Site", {
  buildOutput: "dist",
  fileOptions: [{
    exclude: "*",
    include: "*.js",
    cacheControl: "max-age=31536000,public,immutable",
  }]
});
```
### indexPage?

_Type_ : <span class="mono">string</span>

The name of the index page (e.g. "index.html") of the website.
```js
new StaticSite(stack, "Site", {
  indexPage: "other-index.html",
});
```
### path?

_Type_ : <span class="mono">string</span>

Path to the directory where the website source is located.
```js
new StaticSite(stack, "Site", {
  path: "path/to/src",
});
```
### purgeFiles?

_Type_ : <span class="mono">boolean</span>

While deploying, SST removes old files that no longer exist. Pass in 
`false`
 to keep the old files around.
```js
new StaticSite(stack, "frontend", {
 purge: false
});
```
### replaceValues?

_Type_ : <span class='mono'>Array&lt;<span class="mono">[StaticSiteReplaceProps](#staticsitereplaceprops)</span>&gt;</span>

Pass in a list of placeholder values to be replaced in the website content. For example, the follow configuration:
```js
new StaticSite(stack, "frontend", {
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

### vite.types?

_Type_ : <span class="mono">string</span>

The path where code-gen should place the type definition for environment variables
```js
new StaticSite(stack, "frontend", {
  vite: {
    types: "./other/path/sst-env.d.ts",
  }
});
```

### waitForInvalidation?

_Type_ : <span class="mono">boolean</span>

While deploying, SST waits for the CloudFront cache invalidation process to finish. This ensures that the new content will be served once the deploy command finishes. However, this process can sometimes take more than 5 mins. For non-prod environments it might make sense to pass in 
`false`
. That'll skip waiting for the cache to invalidate and speed up the deploy process.
```js
new StaticSite(stack, "frontend", {
 waitForInvalidation: true
});
```

### cdk.bucket?

_Type_ : <span class="mono">[IBucket](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_s3.IBucket.html)</span><span class='mono'> | </span><span class="mono">[BucketProps](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_s3.BucketProps.html)</span>

Allows you to override default settings this construct uses internally to create the bucket
```js
new StaticSite(stack, "Site", {
  path: "path/to/src",
  cdk: {
    bucket: {
      bucketName: "mybucket",
    },
  }
});
```
### cdk.distribution?

_Type_ : <span class="mono">[IDistribution](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_cloudfront.IDistribution.html)</span><span class='mono'> | </span><span class="mono">[StaticSiteCdkDistributionProps](#staticsitecdkdistributionprops)</span>

Configure the internally created CDK 
`Distribution`
 instance or provide an existing distribution
```js
new StaticSite(stack, "Site", {
  path: "path/to/src",
  cdk: {
    distribution: {
      comment: "Distribution for my React website",
    },
  }
});
```
### cdk.id?

_Type_ : <span class="mono">string</span>

Allows you to override default id for this construct.

## Properties
An instance of `StaticSite` has the following properties.
### customDomainUrl

_Type_ : <span class="mono">undefined</span><span class='mono'> | </span><span class="mono">string</span>

If the custom domain is enabled, this is the URL of the website with the custom domain.
### id

_Type_ : <span class="mono">string</span>

### url

_Type_ : <span class="mono">undefined</span><span class='mono'> | </span><span class="mono">string</span>

The CloudFront URL of the website.
### cdk

_Type_ : <span class="mono">undefined</span><span class='mono'> | </span>
### cdk.bucket

_Type_ : <span class="mono">[Bucket](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_s3.Bucket.html)</span>

### cdk.certificate

_Type_ : <span class="mono">undefined</span><span class='mono'> | </span><span class="mono">[ICertificate](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_certificatemanager.ICertificate.html)</span>

### cdk.distribution

_Type_ : <span class="mono">[Distribution](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_cloudfront.Distribution.html)</span>

### cdk.hostedZone

_Type_ : <span class="mono">undefined</span><span class='mono'> | </span><span class="mono">[IHostedZone](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_route53.IHostedZone.html)</span>


The internally created CDK resources.
## StaticSiteDomainProps
### alternateNames?

_Type_ : <span class='mono'>Array&lt;<span class="mono">string</span>&gt;</span>

Specify additional names that should route to the Cloudfront Distribution. Note, certificates for these names will not be automatically generated so the 
`certificate`
 option must be specified.
### domainAlias?

_Type_ : <span class="mono">string</span>

An alternative domain to be assigned to the website URL. Visitors to the alias will be redirected to the main domain. (ie. 
`www.domain.com`
).

Use this to create a 
`www.`
 version of your domain and redirect visitors to the root domain.
### domainName

_Type_ : <span class="mono">string</span>

The domain to be assigned to the website URL (ie. domain.com).

Supports domains that are hosted either on [Route 53](https://aws.amazon.com/route53/) or externally.
### hostedZone?

_Type_ : <span class="mono">string</span>

The hosted zone in Route 53 that contains the domain. By default, SST will look for a hosted zone matching the domainName that's passed in.

Set this option if SST cannot find the hosted zone in Route 53.
### isExternalDomain?

_Type_ : <span class="mono">boolean</span>

Set this option if the domain is not hosted on Amazon Route 53.

### cdk.certificate?

_Type_ : <span class="mono">[ICertificate](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_certificatemanager.ICertificate.html)</span>

Import the certificate for the domain. By default, SST will create a certificate with the domain name. The certificate will be created in the 
`us-east-1`
(N. Virginia) region as required by AWS CloudFront.

Set this option if you have an existing certificate in the 
`us-east-1`
 region in AWS Certificate Manager you want to use.
### cdk.hostedZone?

_Type_ : <span class="mono">[IHostedZone](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_route53.IHostedZone.html)</span>

Import the underlying Route 53 hosted zone.

## StaticSiteFileOptions
### cacheControl

_Type_ : <span class="mono">string</span>

### exclude

_Type_ : <span class="mono">string</span><span class='mono'> | </span><span class='mono'>Array&lt;<span class="mono">string</span>&gt;</span>

### include

_Type_ : <span class="mono">string</span><span class='mono'> | </span><span class='mono'>Array&lt;<span class="mono">string</span>&gt;</span>

## StaticSiteReplaceProps
### files

_Type_ : <span class="mono">string</span>

### replace

_Type_ : <span class="mono">string</span>

### search

_Type_ : <span class="mono">string</span>

## StaticSiteCdkDistributionProps
### defaultBehavior?

_Type_ : 
