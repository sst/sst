---
description: "Docs for the sst.ViteStaticSite construct in the @serverless-stack/resources package"
---


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


### customDomainUrl

_Type_ : `undefined`&nbsp; | &nbsp;`string`

### distributionDomain

_Type_ : `string`

### distributionId

_Type_ : `string`

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


### cdk.bucket

_Type_ : [`BucketProps`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.BucketProps.html)

### cdk.distribution

_Type_ : [`BaseSiteCdkDistributionProps`](BaseSiteCdkDistributionProps)


### customDomain

_Type_ : `string`&nbsp; | &nbsp;[`BaseSiteDomainProps`](BaseSiteDomainProps)

### disablePlaceholder

_Type_ : `boolean`




### errorPage

_Type_ : `string`

### fileOptions

_Type_ : 
### fileOptions.cacheControl

_Type_ : `string`

### fileOptions.exclude

_Type_ : `string`&nbsp; | &nbsp;`string`

### fileOptions.include

_Type_ : `string`&nbsp; | &nbsp;`string`


### indexPage

_Type_ : `string`

### path

_Type_ : `string`

### replaceValues

_Type_ : [`BaseSiteReplaceProps`](BaseSiteReplaceProps)

### typesPath

_Type_ : `string`

### waitForInvalidation

_Type_ : `boolean`
