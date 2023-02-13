---
title: Extending SST
description: "Learn how to extend SST's built-in constructs."
---

SST maintains a family of built-in constructs that makes it easy to build full-stack apps. We'll be adding more constructs like these to the family and it's usually based on the type of requests we get from the community. But it's possible that the resources you need to create are not yet supported by SST. In this case, you can fallback to using the underlying CDK constructs. And in the case an AWS resource is not yet supported by CDK, you can fallback all the way to using CloudFormation.

:::note
All CDK constructs and CloudFormation resources are supported in SST apps.
:::

## Using CDK constructs

Here is an example of creating a VPC using the CDK construct, and then using the VPC inside the [`Api`](../constructs/Api.md) construct.

```ts
import { Vpc } from "aws-cdk-lib/aws-ec2";
import { Api, StackContext } from "sst/constructs";

function Stack({ stack }: StackContext) {
  // Create a VPC using CDK construct
  const vpc = new Vpc(stack, "VPC");

  // Create an Api using SST construct
  const api = new Api(stack, "Api", {
    defaults: {
      function: {
        vpc,
      },
    },
    routes: {
      "GET /": "src/lambda.main",
    },
  });
}
```

### Accessing CDK constructs created in an SST construct

SST's built-in constructs are high level constructs, that are made up of multiple CDK constructs. As an example, take the [`Api`](../constructs/Api.md) construct configured with a custom domain.

```js
new Api(stack, "Api", {
  customDomain: "api.domain.com",
  routes: {
    "GET /notes": "src/list.main",
  },
});
```

Behind the scenes, the `Api` construct creates a list of CDK constructs. To name a few:

- [`aws-apigatewayv2.HttpApi`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-apigatewayv2.HttpApi.html)
- [`aws-apigatewayv2.DomainName`](https://docs.aws.amazon.com/cdk/api/v2/docs/@aws-cdk_aws-apigatewayv2-alpha.DomainName.html)
- [`aws-certificatemanager.Certificate`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_certificatemanager.Certificate.html)
- [`aws-route53.ARecord`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_route53.ARecord.html)
- [`aws-lambda.Function`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_lambda.Function.html) construct for each route

Most of these CDK constructs are exposed as properties of the `Api` construct.

- `api.httpApi` gives you the `HttpApi`
- `api.apiGatewayDomain` gives you the `DomainName`
- `api.acmCertificate` gives you the `Certificate`

## Using CloudFormation constructs

Let's suppose you are trying to use a resource that doesn't have an SST or CDK construct; you can fall back to using CFN (CloudFormation) constructs. CFN constructs are the exact resources defined by CloudFormation. You must provide the resource's required configuration yourself, as if you were writing CloudFormation YAML templates.

Here is an example of creating an S3 bucket using the [`CfnBucket`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_s3.CfnBucket.html) construct.

```js
import { CfnBucket } from "@aws-cdk/aws-s3";

const cfnBucket = new CfnBucket(stack, "Bucket");
```
