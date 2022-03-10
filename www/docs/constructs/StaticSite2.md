---
description: "Docs for the sst.StaticSite construct in the @serverless-stack/resources package"
---


## Constructor
```ts
new StaticSite(scope: Construct, id: string, props: StaticSiteProps)
```
_Parameters_
- scope [`Construct`](https://docs.aws.amazon.com/cdk/api/v2/docs/constructs.Construct.html)
- id `string`
- props [`StaticSiteProps`](#staticsiteprops)
## Properties
An instance of `StaticSite` has the following properties.
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

### s3Bucket

_Type_ : [`Bucket`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.Bucket.html)

### url

_Type_ : `string`

## StaticSiteFileOption
### cacheControl

_Type_ : `string`

### exclude

_Type_ : `string`&nbsp; | &nbsp;unknown

### include

_Type_ : `string`&nbsp; | &nbsp;unknown

## StaticSiteProps
### buildCommand

_Type_ : `string`

### buildOutput

_Type_ : `string`

### cfDistribution

_Type_ : [`BaseSiteCdkDistributionProps`](BaseSiteCdkDistributionProps)

### customDomain

_Type_ : `string`&nbsp; | &nbsp;[`BaseSiteDomainProps`](BaseSiteDomainProps)

### disablePlaceholder

_Type_ : `boolean`

### environment

_Type_ : unknown

### errorPage

_Type_ : `string`

### fileOptions

_Type_ : unknown

### indexPage

_Type_ : `string`

### path

_Type_ : `string`

### replaceValues

_Type_ : unknown

### s3Bucket

_Type_ : [`BucketProps`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.BucketProps.html)

### waitForInvalidation

_Type_ : `boolean`
