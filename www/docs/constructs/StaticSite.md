---
description: "Docs for the sst.StaticSite construct in the @serverless-stack/resources package"
---

The `StaticSite` construct is a higher level CDK construct that makes it easy to create a static website. It provides a simple way to build and deploy the site to an S3 bucket; setup a CloudFront CDN for fast content delivery; and configure a custom domain for the website url. It is also worth nothing that:
- visitors to the `http` url will be auto-redirected to the `https` url;
- if a domain alias is configured, visitors to the alias (ie. `www.example.com`) will be auto-redirected to the main domain (ie. `example.com`)

See the [examples](#examples) for more details.

## Initializer

```ts
new StaticSite(scope: Construct, id: string, props: StaticSiteProps)
```

_Parameters_

- scope [`Construct`](https://docs.aws.amazon.com/cdk/api/latest/docs/constructs.Construct.html)
- id `string`
- props [`StaticSiteProps`](#staticsiteprops)

## Examples

The `StaticSite` construct is designed to make it easy to get started it with, while allowing for a way to fully configure it as well. Let's look at how, through a couple of examples.

### Creating a plain HTML site

```js
import { StaticSite } from "@serverless-stack/resources";

new StaticSite(this, "Site", {
  path: "path/to/site",
});
```

### Creating a React site

```js
new StaticSite(this, "ReactSite", {
  path: "path/to/site",
  buildCommand: "npm run build",
  buildOutput: "build",
});
```

### Creating a Jekyll site

```js
new StaticSite(this, "JekyllSite", {
  path: "path/to/site",
  errorPage: "404.html",
  buildCommand: "bundle exec jekyll build",
  buildOutput: "_site",
});
```

### Configuring custom domains

You can also configure the website with a custom domain. SST currently supports domains that are configured using [Route 53](https://aws.amazon.com/route53/). If your domains are hosted elsewhere, you can [follow this guide to migrate them to Route 53](https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/MigratingDNS.html).

#### Using the basic config

```js {5}
new StaticSite(this, "ReactSite", {
  path: "path/to/site",
  buildCommand: "npm run build",
  buildOutput: "build",
  customDomain: "domain.com",
});
```

#### Redirect www to non-www

```js {5-8}
new StaticSite(this, "ReactSite", {
  path: "path/to/site",
  buildCommand: "npm run build",
  buildOutput: "build",
  customDomain: {
    domainName: "domain.com",
    domainAlias: "www.domain.com",
  },
});
```

#### Using the full config

```js {5-9}
new StaticSite(this, "ReactSite", {
  path: "path/to/site",
  buildCommand: "npm run build",
  buildOutput: "build",
  customDomain: {
    domainName: "domain.com",
    domainAlias: "www.domain.com",
    hostedZone: "domain.com",
  },
});
```

#### Importing an existing certificate

```js {9}
import { Certificate } from "@aws-cdk/aws-certificatemanager";

new StaticSite(this, "ReactSite", {
  path: "path/to/site",
  buildCommand: "npm run build",
  buildOutput: "build",
  customDomain: {
    domainName: "domain.com",
    certificate: Certificate.fromCertificateArn(this, "MyCert", certArn),
  },
});
```

Note that, the certificate needs be created in the `us-east-1`(N. Virginia) region as required by AWS CloudFront.

#### Specifying a hosted zone

If you have multiple hosted zones for a given domain, you can choose a specific one to be used when configuring the domain.

```js {9-12}
import { HostedZone } from "@aws-cdk/aws-route53";

new StaticSite(this, "ReactSite", {
  path: "path/to/site",
  buildCommand: "npm run build",
  buildOutput: "build",
  customDomain: {
    domainName: "domain.com",
    hostedZone: HostedZone.fromHostedZoneAttributes(this, "MyZone", {
      hostedZoneId,
      zoneName,
    }),
  },
});
```

### Configuring the S3 Bucket

Configure the internally created CDK `Bucket` instance.

```js {2-4}
import { RemovalPolicy } from "@aws-cdk/core";

new StaticSite(this, "ReactSite", {
  path: "path/to/site",
  buildCommand: "npm run build",
  buildOutput: "build",
  dynamodbTable: {
    removalPolicy: RemovalPolicy.DESTROY,
  },
});
```

### Configuring the CloudFront Distribution

Configure the internally created CDK `Distribution` instance.

```js {2-4}
new StaticSite(this, "ReactSite", {
  path: "path/to/site",
  buildCommand: "npm run build",
  buildOutput: "build",
  cfDistribution: {
    comment: "Distribution for my React website",
  },
});
```

## Properties

An instance of `AppSyncApi` contains the following properties.

### url

_Type_: `string`

The CloudFront URL of the website.

### customDomainUrl?

_Type_: `string`

If custom domain is enabled, this is the custom domain URL of the website.

### bucketArn

_Type_: `string`

The ARN of the internally created CDK `Bucket` instance.

### tableName

_Type_: `string`

The name of the internally created CDK `Bucket` instance.

### distributionId

_Type_: `string`

The ID of the internally created CDK `Distribution` instance.

### distributionDomain

_Type_: `string`

The domain name of the internally created CDK `Distribution` instance.

### s3Bucket

_Type_ : [`cdk.aws-s3.Bucket`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-s3.Bucket.html)

The internally created CDK `Bucket` instance.

### cfDistribution

_Type_ : [`cdk.aws-cloudfront.Distribution`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-cloudfront.Distribution.html)

The internally created CDK `Distribution` instance.

## StaticSiteProps

### path

_Type_ : `string`

Path to the directory where the website source is located.

### indexPage?

_Type_ : `string`, _defaults to_ `index.html`

The name of the index page (e.g. "index.html") for the website.

### errorPage?

_Type_ : `string`, _defaults to the indexPage_

The name of the error page (e.g. "404.html") for the website.

### buildCommand?

_Type_ : `string`, _defaults to no build command_

The command for building the website (e.g. "npm run build").

### buildOutput?

_Type_ : `string`, _defaults to the path_

The directory with the content that will be uploaded to the S3 bucket. If a `buildCommand` is provided, this is usually where the build output is generated.

### customDomain?

_Type_ : `string | StaticSiteDomainProps`

The customDomain for this website. SST currently supports domains that are configured using [Route 53](https://aws.amazon.com/route53/). If your domains are hosted elsewhere, you can [follow this guide to migrate them to Route 53](https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/MigratingDNS.html).

Takes either the domain as a string.

```
"domain.com"
```

Or the [StaticSiteDomainProps](#staticsitedomainprops).

```js
{
  domainName: "domain.com",
  domainAlias: "www.domain.com",
  hostedZone: "domain.com",
}
```

### s3Bucket?

_Type_: [`cdk.aws-s3.BucketProps`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-s3.BucketProps.html)

Pass in a `cdk.aws-s3.BucketProps` value to override the default settings this construct uses to create the CDK `Bucket` internally.

### cfDistribution?

_Type_: [`StaticSiteCdkDistributionProps`](#staticsitecdkdistributionprops)

Pass in a `StaticSiteCdkDistributionProps` value to override the default settings this construct uses to create the CDK `Distribution` internally.

## StaticSiteDomainProps

### domainName

_Type_ : `string`

The domain to be assigned to the website url (ie. `domain.com`).

Currently supports domains that are configured using [Route 53](https://aws.amazon.com/route53/).

### domainAlias?

_Type_ : `string`, _defaults to no alias configured_

An alternative domain to be assigned to the website url (ie. `www.domain.com`).

Visitor to the alias domain will be automatically redirected to the `domainName`.

### hostedZone?

_Type_ : `string | cdk.aws-route53.IHostedZone`, _defaults to the domain name_

The hosted zone in Route 53 that contains the domain. Takes the name of the hosted zone as a `string` or the hosted zone construct [`cdk.aws-route53.HostedZone`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-route53.HostedZone.html). By default, SST will look for a hosted zone matching the `domainName` that's passed in.

Set this option if SST cannot find the hosted zone in Route 53.

### certificate?

_Type_ : [`cdk.aws-certificatemanager.ICertificate`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-certificatemanager.ICertificate.html), _defaults to `undefined`_

The certificate for the domain. By default, SST will create a certificate with the domain name from the `domainName` option. The certificate will be created in the `us-east-1`(N. Virginia) region as required by AWS CloudFront.

Set this option if you have an existing certificate in the `us-east-1` region in AWS Certificate Manager you want to use.

## StaticSiteCdkDistributionProps

`StaticSiteCdkDistributionProps` extends [`cdk.aws-cloudfront.DistributionProps`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-cloudfront.DistributionProps.html) with the exception that the `defaultBehavior` field is **not required**.

You can use `StaticSiteCdkDistributionProps` to configure the CloudFront distribution properties.
