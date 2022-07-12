### Configuring custom domains

You can configure the website with a custom domain hosted either on [Route 53](https://aws.amazon.com/route53/) or [externally](#configuring-externally-hosted-domain).

#### Using the basic config (Route 53 domains)

```js {3}
new RemixSite(stack, "Site", {
  path: "my-remix-site/",
  customDomain: "my-app.com",
});
```

#### Redirect www to non-www (Route 53 domains)

```js {3-6}
new RemixSite(stack, "Site", {
  path: "my-remix-site/",
  customDomain: {
    domainName: "my-app.com",
    domainAlias: "www.my-app.com",
  },
});
```

#### Configuring domains across stages (Route 53 domains)

```js {3-7}
new RemixSite(stack, "Site", {
  path: "my-remix-site/",
  customDomain: {
    domainName:
      scope.stage === "prod" ? "my-app.com" : `${scope.stage}.my-app.com`,
    domainAlias: scope.stage === "prod" ? "www.my-app.com" : undefined,
  },
});
```

#### Using the full config (Route 53 domains)

```js {3-7}
new RemixSite(stack, "Site", {
  path: "my-remix-site/",
  customDomain: {
    domainName: "my-app.com",
    domainAlias: "www.my-app.com",
    hostedZone: "my-app.com",
  },
});
```

#### Importing an existing certificate (Route 53 domains)

```js {8}
import { Certificate } from "aws-cdk-lib/aws-certificatemanager";

new RemixSite(stack, "Site", {
  path: "my-remix-site/",
  customDomain: {
    domainName: "my-app.com",
    cdk: {
      certificate: Certificate.fromCertificateArn(stack, "MyCert", certArn),
    },
  },
});
```

Note that, the certificate needs be created in the `us-east-1`(N. Virginia) region as required by AWS CloudFront.

#### Specifying a hosted zone (Route 53 domains)

If you have multiple hosted zones for a given domain, you can choose the one you want to use to configure the domain.

```js {8-11}
import { HostedZone } from "aws-cdk-lib/aws-route53";

new RemixSite(stack, "Site", {
  path: "my-remix-site/",
  customDomain: {
    domainName: "my-app.com",
    cdk: {
      hostedZone: HostedZone.fromHostedZoneAttributes(stack, "MyZone", {
        hostedZoneId,
        zoneName,
      }),
    },
  },
});
```

#### Configuring externally hosted domain

```js {5-11}
import { Certificate } from "aws-cdk-lib/aws-certificatemanager";

new RemixSite(stack, "Site", {
  path: "my-remix-site/",
  cutomDomain: {
    isExternalDomain: true,
    domainName: "my-app.com",
    cdk: {
      certificate: Certificate.fromCertificateArn(stack, "MyCert", certArn),
    },
  },
});
```

Note that the certificate needs be created in the `us-east-1`(N. Virginia) region as required by AWS CloudFront, and validated. After the `Distribution` has been created, create a CNAME DNS record for your domain name with the `Distribution's` URL as the value. Here are more details on [configuring SSL Certificate on externally hosted domains](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/CNAMEs.html).

Also note that you can also migrate externally hosted domains to Route 53 by [following this guide](https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/MigratingDNS.html).

### Configuring the Lambda Function

Configure the internally created CDK [`Lambda Function`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_lambda.Function.html) instance.

```js {4-8}
new RemixSite(stack, "Site", {
  path: "my-remix-site/",
  defaults: {
    function: {
      timeout: 20,
      memorySize: 2048,
      permissions: ["sns"],
    }
  },
});
```

### Advanced examples

#### Reusing CloudFront cache policies

CloudFront has a limit of 20 cache policies per AWS account. This is a hard limit, and cannot be increased. Each `RemixSite` creates 3 cache policies. If you plan to deploy multiple Remix sites, you can have the constructs share the same cache policies by reusing them across sites.

```js
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";

const cachePolicies = {
  browserBuildCachePolicy: new cloudfront.CachePolicy(stack, "BrowserBuildStaticsCache", RemixSite.browserBuildCachePolicyProps),
  publicCachePolicy: new cloudfront.CachePolicy(stack, "PublicStaticsCache", RemixSite.publicCachePolicyProps),
  serverResponseCachePolicy: new cloudfront.CachePolicy(stack, "ServerResponseCache", RemixSite.serverResponseCachePolicyProps),
};

new RemixSite(stack, "Site1", {
  path: "my-remix-site/",
  cdk: {
    cachePolicies,
  }
});

new RemixSite(stack, "Site2", {
  path: "another-remix-site/",
  cdk: {
    cachePolicies,
  }
});
```
