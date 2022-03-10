---
description: "Docs for the sst.ReactStaticSite construct in the @serverless-stack/resources package"
---


## Constructor
```ts
new ReactStaticSite(scope: Construct, id: string, props: StaticSiteProps)
```
_Parameters_
- scope [`Construct`](https://docs.aws.amazon.com/cdk/api/v2/docs/constructs.Construct.html)
- id `string`
- props [`StaticSiteProps`](StaticSiteProps)
## Properties
An instance of `ReactStaticSite` has the following properties.
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
An instance of `ReactStaticSite` has the following methods.
### getConstructMetadata

```ts
getConstructMetadata(undefined)
```