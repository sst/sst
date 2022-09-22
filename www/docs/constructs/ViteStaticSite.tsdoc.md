<!--
!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
!!                                                           !!
!!  This file has been automatically generated, do not edit  !!
!!                                                           !!
!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
-->

## Constructor
```ts
new ViteStaticSite(scope, id, props)
```
_Parameters_
- __scope__ <span class="mono">[Construct](https://docs.aws.amazon.com/cdk/api/v2/docs/constructs.Construct.html)</span>
- __id__ <span class="mono">string</span>
- __props__ <span class="mono">[ViteStaticSiteProps](#vitestaticsiteprops)</span>
## ViteStaticSiteProps


### buildCommand?

_Type_ : <span class="mono">string</span>

The command for building the website


```js
new ViteStaticSite(stack, "Site", {
  buildCommand: "npm run build",
});
```

### buildOutput?

_Type_ : <span class="mono">string</span>

The directory with the content that will be uploaded to the S3 bucket. If a `buildCommand` is provided, this is usually where the build output is generated. The path is relative to the [`path`](#path) where the website source is located.


```js
new ViteStaticSite(stack, "Site", {
  buildOutput: "dist",
});
```

### customDomain?

_Type_ : <span class='mono'><span class="mono">string</span> | <span class="mono">[StaticSiteDomainProps](StaticSite#staticsitedomainprops)</span></span>

The customDomain for this website. SST supports domains that are hosted either on [Route 53](https://aws.amazon.com/route53/) or externally.
Note that you can also migrate externally hosted domains to Route 53 by [following this guide](https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/MigratingDNS.html).


```js
new ViteStaticSite(stack, "Site", {
  path: "path/to/src",
  customDomain: "domain.com",
});
```


```js
new ViteStaticSite(stack, "Site", {
  path: "path/to/src",
  customDomain: {
    domainName: "domain.com",
    domainAlias: "www.domain.com",
    hostedZone: "domain.com"
  }
});
```

### disablePlaceholder?

_Type_ : <span class="mono">boolean</span>

_Default_ : <span class="mono">false</span>

When running `sst start`, a placeholder site is deployed. This is to ensure that the site content remains unchanged, and subsequent `sst start` can start up quickly.


```js
new ViteStaticSite(stack, "ReactSite", {
 disablePlaceholder: true
});
```

### environment?

_Type_ : <span class="mono">Record&lt;<span class="mono">string</span>, <span class="mono">string</span>&gt;</span>

An object with the key being the environment variable name. Note, this requires your build tool to support build time environment variables.


```js
new ViteStaticSite(stack, "ReactSite", {
  environment: {
    REACT_APP_API_URL: api.url,
    REACT_APP_USER_POOL_CLIENT: auth.cognitoUserPoolClient.userPoolClientId,
  },
});
```

### errorPage?

_Type_ : <span class='mono'><span class="mono">"redirect_to_index_page"</span> | <span class="mono">Omit&lt;<span class="mono">string</span>, <span class="mono">"redirect_to_index_page"</span>&gt;</span></span>

The error page behavior for this website. Takes either an HTML page.
```
404.html
```
Or the constant `"redirect_to_index_page"` to redirect to the index page.
Note that, if the error pages are redirected to the index page, the HTTP status code is set to 200. This is necessary for single page apps, that handle 404 pages on the client side.


```js
new ViteStaticSite(stack, "Site", {
  errorPage: "redirect_to_index_page",
});
```

### fileOptions?

_Type_ : <span class='mono'>Array&lt;<span class="mono">[StaticSiteFileOptions](StaticSite#staticsitefileoptions)</span>&gt;</span>

Pass in a list of file options to configure cache control for different files. Behind the scenes, the `StaticSite` construct uses a combination of the `s3 cp` and `s3 sync` commands to upload the website content to the S3 bucket. An `s3 cp` command is run for each file option block, and the options are passed in as the command options.


```js
new ViteStaticSite(stack, "Site", {
  buildOutput: "dist",
  fileOptions: {
    exclude: "*",
    include: "*.js",
    cacheControl: "max-age=31536000,public,immutable",
  }
});
```

### indexPage?

_Type_ : <span class="mono">string</span>

_Default_ : <span class="mono">"index.html"</span>

The name of the index page (e.g. "index.html") of the website.


```js
new ViteStaticSite(stack, "Site", {
  indexPage: "other-index.html",
});
```

### path

_Type_ : <span class="mono">string</span>

Path to the directory where the website source is located.


```js
new ViteStaticSite(stack, "Site", {
  path: "path/to/src",
});
```

### purgeFiles?

_Type_ : <span class="mono">boolean</span>

_Default_ : <span class="mono">true</span>

While deploying, SST removes old files that no longer exist. Pass in `false` to keep the old files around.


```js
new ViteStaticSite(stack, "ReactSite", {
 purge: false
});
```

### replaceValues?

_Type_ : <span class='mono'>Array&lt;<span class="mono">[StaticSiteReplaceProps](StaticSite#staticsitereplaceprops)</span>&gt;</span>

Pass in a list of placeholder values to be replaced in the website content. For example, the follow configuration:


```js
new ViteStaticSite(stack, "ReactSite", {
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

_Type_ : <span class="mono">string</span>

_Default_ : <span class="mono">"src/sst-env.d.ts"</span>

The path where code-gen should place the type definition for environment variables


```js
new ViteStaticSite(stack, "Site", {
  typesFile: "./other/path/sst-env.d.ts",
})
```

### waitForInvalidation?

_Type_ : <span class="mono">boolean</span>

_Default_ : <span class="mono">true</span>

While deploying, SST waits for the CloudFront cache invalidation process to finish. This ensures that the new content will be served once the deploy command finishes. However, this process can sometimes take more than 5 mins. For non-prod environments it might make sense to pass in `false`. That'll skip waiting for the cache to invalidate and speed up the deploy process.


```js
new ViteStaticSite(stack, "ReactSite", {
 waitForInvalidation: false
});
```


### cdk.bucket?

_Type_ : <span class='mono'><span class="mono">[IBucket](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_s3.IBucket.html)</span> | <span class="mono">[BucketProps](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_s3.BucketProps.html)</span></span>

Allows you to override default settings this construct uses internally to ceate the bucket


```js
new ViteStaticSite(stack, "Site", {
  path: "path/to/src",
  cdk: {
    bucket: {
      bucketName: "mybucket",
    },
  }
});
```

### cdk.distribution?

_Type_ : <span class="mono">[StaticSiteCdkDistributionProps](StaticSite#staticsitecdkdistributionprops)</span>

Configure the internally created CDK `Distribution` instance.


```js
new ViteStaticSite(stack, "Site", {
  path: "path/to/src",
  cdk: {
    distribution: {
      comment: "Distribution for my React website",
    },
  }
});
```


## Properties
An instance of `ViteStaticSite` has the following properties.
### bucketArn

_Type_ : <span class="mono">string</span>

The ARN of the internally created S3 Bucket.

### bucketName

_Type_ : <span class="mono">string</span>

The name of the internally created S3 Bucket.

### customDomainUrl

_Type_ : <span class='mono'><span class="mono">undefined</span> | <span class="mono">string</span></span>

If the custom domain is enabled, this is the URL of the website with the custom domain.

### distributionDomain

_Type_ : <span class="mono">string</span>

The domain name of the internally created CloudFront Distribution.

### distributionId

_Type_ : <span class="mono">string</span>

The ID of the internally created CloudFront Distribution.

### url

_Type_ : <span class="mono">string</span>

The CloudFront URL of the website.


### cdk.bucket

_Type_ : <span class="mono">[Bucket](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_s3.Bucket.html)</span>

The internally created CDK `Bucket` instance.

### cdk.certificate?

_Type_ : <span class="mono">[ICertificate](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_certificatemanager.ICertificate.html)</span>

### cdk.distribution

_Type_ : <span class="mono">[Distribution](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_cloudfront.Distribution.html)</span>

The internally created CDK `Distribution` instance.

### cdk.hostedZone?

_Type_ : <span class="mono">[IHostedZone](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_route53.IHostedZone.html)</span>

The Route 53 hosted zone for the custom domain.


## Methods
An instance of `ViteStaticSite` has the following methods.
### getConstructMetadata

```ts
getConstructMetadata()
```