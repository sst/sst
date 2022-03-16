---
description: "Docs for the sst.ReactStaticSite construct in the @serverless-stack/resources package"
---


## Constructor
```ts
new ReactStaticSite(scope: Construct, id: string, props: StaticSiteProps)
```
_Parameters_
- __scope__ [`Construct`](https://docs.aws.amazon.com/cdk/api/v2/docs/constructs.Construct.html)
- __id__ `string`
- __props__ [`StaticSiteProps`](StaticSiteProps)
## Properties
An instance of `ReactStaticSite` has the following properties.
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
An instance of `ReactStaticSite` has the following methods.
### getConstructMetadata

```ts
getConstructMetadata(undefined)
```