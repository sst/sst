---
description: "Docs for the sst.NextjsSite construct in the @serverless-stack/resources package"
---


## Constructor
```ts
new NextjsSite(scope: Construct, id: string, props: NextjsSiteProps)
```
_Parameters_
- __scope__ [`Construct`](https://docs.aws.amazon.com/cdk/api/v2/docs/constructs.Construct.html)
- __id__ `string`
- __props__ [`NextjsSiteProps`](#nextjssiteprops)
## Properties
An instance of `NextjsSite` has the following properties.
### bucketArn

_Type_ : `string`

### bucketName

_Type_ : `string`


### cdk.bucket

_Type_ : [`Bucket`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.Bucket.html)

### cdk.certificate

_Type_ : [`ICertificate`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.ICertificate.html)

### cdk.distribution

_Type_ : [`Distribution`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.Distribution.html)

### cdk.hostedZone

_Type_ : [`IHostedZone`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.IHostedZone.html)

### cdk.regenerationQueue

_Type_ : [`Queue`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.Queue.html)


### customDomainUrl

_Type_ : `undefined`&nbsp; | &nbsp;`string`

### distributionDomain

_Type_ : `string`

### distributionId

_Type_ : `string`

### imageCachePolicyProps

_Type_ : [`CachePolicyProps`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.CachePolicyProps.html)

### lambdaCachePolicyProps

_Type_ : [`CachePolicyProps`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.CachePolicyProps.html)

### staticCachePolicyProps

_Type_ : [`CachePolicyProps`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.CachePolicyProps.html)

### url

_Type_ : `string`

## Methods
An instance of `NextjsSite` has the following methods.
### attachPermissions

```ts
attachPermissions(permissions: Permissions)
```
_Parameters_
- __permissions__ [`Permissions`](Permissions)
## NextjsSiteProps

### cdk.bucket

_Type_ : [`BucketProps`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.BucketProps.html)


### cdk.cachePolicies.imageCachePolicy

_Type_ : [`ICachePolicy`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.ICachePolicy.html)

### cdk.cachePolicies.lambdaCachePolicy

_Type_ : [`ICachePolicy`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.ICachePolicy.html)

### cdk.cachePolicies.staticCachePolicy

_Type_ : [`ICachePolicy`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.ICachePolicy.html)


### cdk.distribution

_Type_ : [`BaseSiteCdkDistributionProps`](BaseSiteCdkDistributionProps)

### cdk.regenerationQueue

_Type_ : [`QueueProps`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.QueueProps.html)


### customDomain

_Type_ : `string`&nbsp; | &nbsp;[`BaseSiteDomainProps`](BaseSiteDomainProps)



### defaults.function.memorySize

_Type_ : `number`

### defaults.function.permissions

_Type_ : [`Permissions`](Permissions)

### defaults.function.timeout

_Type_ : `number`



### disablePlaceholder

_Type_ : `boolean`




### path

_Type_ : `string`

### waitForInvalidation

_Type_ : `boolean`
