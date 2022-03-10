---
description: "Docs for the sst.ViteStaticSite construct in the @serverless-stack/resources package"
---


## Constructor
```ts
new ViteStaticSite(scope: Construct, id: string, props: ViteStaticSiteProps)
```
_Parameters_
- scope [`Construct`](https://docs.aws.amazon.com/cdk/api/v2/docs/constructs.Construct.html)
- id `string`
- props [`ViteStaticSiteProps`](#vitestaticsiteprops)
## Properties
An instance of `ViteStaticSite` has the following properties.
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

## Methods
An instance of `ViteStaticSite` has the following methods.
### getConstructMetadata

```ts
getConstructMetadata(undefined)
```
## ViteStaticSiteProps
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

### typesPath

_Type_ : `string`

### waitForInvalidation

_Type_ : `boolean`
