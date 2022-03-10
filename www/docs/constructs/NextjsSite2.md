---
description: "Docs for the sst.NextjsSite construct in the @serverless-stack/resources package"
---


## Constructor
```ts
new NextjsSite(scope: Construct, id: string, props: NextjsSiteProps)
```
_Parameters_
- scope [`Construct`](https://docs.aws.amazon.com/cdk/api/v2/docs/constructs.Construct.html)
- id `string`
- props [`NextjsSiteProps`](#nextjssiteprops)
## Properties
An instance of `NextjsSite` has the following properties.
### acmCertificate

_Type_ : [`ICertificate`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.ICertificate.html)

### bucketArn

_Type_ : `string`

### bucketName

_Type_ : `string`

### cfDistribution

_Type_ : [`Distribution`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.Distribution.html)

### customDomainUrl

_Type_ : `undefined`&nbsp; | &nbsp;`string`

### distributionDomain

_Type_ : `string`

### distributionId

_Type_ : `string`

### hostedZone

_Type_ : [`IHostedZone`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.IHostedZone.html)

### imageCachePolicyProps

_Type_ : [`CachePolicyProps`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.CachePolicyProps.html)

### lambdaCachePolicyProps

_Type_ : [`CachePolicyProps`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.CachePolicyProps.html)

### s3Bucket

_Type_ : [`Bucket`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.Bucket.html)

### sqsRegenerationQueue

_Type_ : [`Queue`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.Queue.html)

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
- permissions [`Permissions`](Permissions)
## NextjsSiteCachePolicyProps
### imageCachePolicy

_Type_ : [`ICachePolicy`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.ICachePolicy.html)

### lambdaCachePolicy

_Type_ : [`ICachePolicy`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.ICachePolicy.html)

### staticCachePolicy

_Type_ : [`ICachePolicy`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.ICachePolicy.html)

## NextjsSiteFunctionProps
### memorySize

_Type_ : `number`

### permissions

_Type_ : [`Permissions`](Permissions)

### timeout

_Type_ : `number`

## NextjsSiteProps
### cfCachePolicies

_Type_ : [`NextjsSiteCachePolicyProps`](#nextjssitecachepolicyprops)

### cfDistribution

_Type_ : [`BaseSiteCdkDistributionProps`](BaseSiteCdkDistributionProps)

### customDomain

_Type_ : `string`&nbsp; | &nbsp;[`BaseSiteDomainProps`](BaseSiteDomainProps)

### defaultFunctionProps

_Type_ : [`NextjsSiteFunctionProps`](#nextjssitefunctionprops)

### disablePlaceholder

_Type_ : `boolean`

### environment

_Type_ : unknown

### path

_Type_ : `string`

### s3Bucket

_Type_ : [`BucketProps`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.BucketProps.html)

### sqsRegenerationQueue

_Type_ : [`QueueProps`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.QueueProps.html)

### waitForInvalidation

_Type_ : `boolean`
