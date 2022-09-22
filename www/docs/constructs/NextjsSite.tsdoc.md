<!--
!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
!!                                                           !!
!!  This file has been automatically generated, do not edit  !!
!!                                                           !!
!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
-->

## Constructor
```ts
new NextjsSite(scope, id, props)
```
_Parameters_
- __scope__ <span class="mono">[Construct](https://docs.aws.amazon.com/cdk/api/v2/docs/constructs.Construct.html)</span>
- __id__ <span class="mono">string</span>
- __props__ <span class="mono">[NextjsSiteProps](#nextjssiteprops)</span>
## NextjsSiteProps



### commandHooks.afterBuild?

_Type_ : <span class='mono'>Array&lt;<span class="mono">string</span>&gt;</span>

Commands to run after building the Next.js app. Commands are chained with `&&`, and they are run inside the Next.js app folder.


```js
new NextjsSite(stack, "NextSite", {
  path: "path/to/site",
  commandHooks: {
    afterBuild: ["npx next-sitemap"],
  }
});
```


### customDomain?

_Type_ : <span class='mono'><span class="mono">string</span> | <span class="mono">[NextjsDomainProps](#nextjsdomainprops)</span></span>

The customDomain for this website. SST supports domains that are hosted either on [Route 53](https://aws.amazon.com/route53/) or externally.
Note that you can also migrate externally hosted domains to Route 53 by [following this guide](https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/MigratingDNS.html).


```js {3}
new NextjsSite(stack, "Site", {
  path: "path/to/site",
  customDomain: "domain.com",
});
```

```js {3-6}
new NextjsSite(stack, "Site", {
  path: "path/to/site",
  customDomain: {
    domainName: "domain.com",
    domainAlias: "www.domain.com",
    hostedZone: "domain.com"
  },
});
```



### defaults.function.memorySize?

_Type_ : <span class="mono">number</span>

### defaults.function.permissions?

_Type_ : <span class="mono">[Permissions](Permissions)</span>

### defaults.function.runtime?

_Type_ : <span class='mono'><span class="mono">"nodejs12.x"</span> | <span class="mono">"nodejs14.x"</span> | <span class="mono">"nodejs16.x"</span></span>

_Default_ : <span class="mono">"nodejs16.x"</span>

The runtime environment.


```js
new NextjsSite(stack, "Function", {
  path: "path/to/site",
  runtime: "nodejs16.x",
})
```

### defaults.function.timeout?

_Type_ : <span class="mono">number</span>



### disablePlaceholder?

_Type_ : <span class="mono">boolean</span>

When running `sst start`, a placeholder site is deployed. This is to ensure that the site content remains unchanged, and subsequent `sst start` can start up quickly.


```js {3}
new NextjsSite(stack, "NextSite", {
  path: "path/to/site",
  disablePlaceholder: true,
});
```




An object with the key being the environment variable name.


```js {3-6}
new NextjsSite(stack, "NextSite", {
  path: "path/to/site",
  environment: {
    API_URL: api.url,
    USER_POOL_CLIENT: auth.cognitoUserPoolClient.userPoolClientId,
  },
});
```

### nextBinPath?

_Type_ : <span class="mono">string</span>

_Default_ : <span class="mono">"./node_modules/.bin/next"</span>

Path to the next executable, typically in node_modules.
This should be used if next is installed in a non-standard location.

### path

_Type_ : <span class="mono">string</span>

Path to the directory where the website source is located.

### waitForInvalidation?

_Type_ : <span class="mono">boolean</span>

While deploying, SST waits for the CloudFront cache invalidation process to finish. This ensures that the new content will be served once the deploy command finishes. However, this process can sometimes take more than 5 mins. For non-prod environments it might make sense to pass in `false`. That'll skip waiting for the cache to invalidate and speed up the deploy process.


### cdk.bucket?

_Type_ : <span class='mono'><span class="mono">[IBucket](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_s3.IBucket.html)</span> | <span class="mono">[BucketProps](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_s3.BucketProps.html)</span></span>

Allows you to override default settings this construct uses internally to ceate the bucket


### cdk.cachePolicies.imageCachePolicy?

_Type_ : <span class="mono">[ICachePolicy](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_cloudfront.ICachePolicy.html)</span>

### cdk.cachePolicies.lambdaCachePolicy?

_Type_ : <span class="mono">[ICachePolicy](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_cloudfront.ICachePolicy.html)</span>

### cdk.cachePolicies.staticCachePolicy?

_Type_ : <span class="mono">[ICachePolicy](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_cloudfront.ICachePolicy.html)</span>


Override the default CloudFront cache policies created internally.

### cdk.distribution?

_Type_ : <span class="mono">[NextjsCdkDistributionProps](#nextjscdkdistributionprops)</span>

Pass in a value to override the default settings this construct uses to create the CDK `Distribution` internally.

### cdk.imageOriginRequestPolicy?

_Type_ : <span class="mono">[IOriginRequestPolicy](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_cloudfront.IOriginRequestPolicy.html)</span>

Override the default CloudFront image origin request policy created internally

### cdk.regenerationQueue?

_Type_ : <span class="mono">[QueueProps](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_sqs.QueueProps.html)</span>

Override the default settings this construct uses to create the CDK `Queue` internally.


## Properties
An instance of `NextjsSite` has the following properties.
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

### imageCachePolicyProps

_Type_ : <span class="mono">[CachePolicyProps](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_cloudfront.CachePolicyProps.html)</span>

The default CloudFront cache policy properties for images.

### imageOriginRequestPolicyProps

_Type_ : <span class="mono">[OriginRequestPolicyProps](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_cloudfront.OriginRequestPolicyProps.html)</span>

The default CloudFront image origin request policy properties for Lambda@Edge.

### lambdaCachePolicyProps

_Type_ : <span class="mono">[CachePolicyProps](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_cloudfront.CachePolicyProps.html)</span>

The default CloudFront cache policy properties for Lambda@Edge.

### staticCachePolicyProps

_Type_ : <span class="mono">[CachePolicyProps](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_cloudfront.CachePolicyProps.html)</span>

The default CloudFront cache policy properties for static pages.

### url

_Type_ : <span class="mono">string</span>

The CloudFront URL of the website.


### cdk.bucket

_Type_ : <span class="mono">[Bucket](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_s3.Bucket.html)</span>

The internally created CDK `Bucket` instance.

### cdk.certificate?

_Type_ : <span class="mono">[ICertificate](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_certificatemanager.ICertificate.html)</span>

The AWS Certificate Manager certificate for the custom domain.

### cdk.distribution

_Type_ : <span class="mono">[Distribution](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_cloudfront.Distribution.html)</span>

The internally created CDK `Distribution` instance.

### cdk.hostedZone?

_Type_ : <span class="mono">[IHostedZone](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_route53.IHostedZone.html)</span>

The Route 53 hosted zone for the custom domain.

### cdk.regenerationQueue

_Type_ : <span class="mono">[Queue](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_sqs.Queue.html)</span>

The internally created CDK `Queue` instance.


## Methods
An instance of `NextjsSite` has the following methods.
### attachPermissions

```ts
attachPermissions(permissions)
```
_Parameters_
- __permissions__ <span class="mono">[Permissions](Permissions)</span>


Attaches the given list of permissions to allow the Next.js API routes and Server Side rendering `getServerSideProps` to access other AWS resources.


### Attaching permissions

```js {5}
const site = new NextjsSite(stack, "Site", {
  path: "path/to/site",
});

site.attachPermissions(["sns"]);
```

## NextjsDomainProps


### alternateNames?

_Type_ : <span class='mono'>Array&lt;<span class="mono">string</span>&gt;</span>

_Default_ : <span class="mono">`[]`</span>

Specify additional names that should route to the Cloudfront Distribution. Note, certificates for these names will not be automatically generated so the `certificate` option must be specified.

### domainAlias?

_Type_ : <span class="mono">string</span>

_Default_ : <span class="mono">no alias configured</span>

An alternative domain to be assigned to the website URL. Visitors to the alias will be redirected to the main domain. (ie. `www.domain.com`).
Use this to create a `www.` version of your domain and redirect visitors to the root domain.
### domainName

_Type_ : <span class="mono">string</span>

The domain to be assigned to the website URL (ie. domain.com).
Supports domains that are hosted either on [Route 53](https://aws.amazon.com/route53/) or externally.

### hostedZone?

_Type_ : <span class="mono">string</span>

_Default_ : <span class="mono">same as the `domainName`</span>

The hosted zone in Route 53 that contains the domain. By default, SST will look for a hosted zone matching the domainName that's passed in.
Set this option if SST cannot find the hosted zone in Route 53.
### isExternalDomain?

_Type_ : <span class="mono">boolean</span>

_Default_ : <span class="mono">`false`</span>

Set this option if the domain is not hosted on Amazon Route 53.


### cdk.certificate?

_Type_ : <span class="mono">[ICertificate](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_certificatemanager.ICertificate.html)</span>

Import the certificate for the domain. By default, SST will create a certificate with the domain name. The certificate will be created in the `us-east-1`(N. Virginia) region as required by AWS CloudFront.
Set this option if you have an existing certificate in the `us-east-1` region in AWS Certificate Manager you want to use.

### cdk.hostedZone?

_Type_ : <span class="mono">[IHostedZone](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_route53.IHostedZone.html)</span>

Import the underlying Route 53 hosted zone.


## NextjsCdkDistributionProps


### defaultBehavior?

_Type_ : 
