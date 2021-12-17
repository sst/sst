---
title: Extending SST 🟢
description: "How to extend the capabilities of SST constructs"
---

SST maintains a family of constructs that makes it easy to build your backend applications. We are adding more constructs to the family over time based on requests. It's possible that the resources you need to create is not yet supported by SST. In this case, you can fall back to use the CDK constructs. And in the case a certain AWS resource is not yet supported by CDK, you can also fall back to use CloudFormation constructs.

:::note
All CDK constructs and all CloudFormation resources are supported in SST apps.
:::

## Using CDK constructs

Here is an example of creating an VPC using the CDK construct, and then use the VPC inside the [`Api`](../constructs/Api.md) construct.

```js {13} title="stacks/MyStack.js"
import { Vpc } from "@aws-cdk/aws-ec2";
import { Api } from "@serverless-stack/resources";

class MyStack extends sst.Stack {
  constructor(scope, id, props) {
    super(scope, id, props);

    // Create a VPC using CDK construct
    const vpc = new Vpc(this, "VPC");

    // Create an Api using SST construct
    const api = new Api(this, "Api", {
      defaultFunctionProps: { vpc },
      routes: {
        "GET /": "src/lambda.main",
      },
    });
  }
}
```

## Accessing CDK constructs within an SST construct

SST constructs are high level constructs, each consists of multiple CDK constructs. Take this `Api` construct with the custom domain configured as an example.

```js
new Api(this, "Api", {
  customDomain: "api.domain.com",
  routes: {
    "GET /notes": "src/list.main",
  },
});
```

The `Api` construct creates a list of CDK constructs behind the scene. To name a few:
- an [`aws-apigatewayv2.HttpApi`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-apigatewayv2.HttpApi.html) construct;
- an [`aws-apigatewayv2.DomainName`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-apigatewayv2.DomainName.html) construct;
- an [`aws-certificatemanager.Certificate`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-certificatemanager.Certificate.html) construct;
- an [`aws-route53.ARecord`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-route53.ARecord.html) construct;
- an [`aws-lambda.Function`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-lambda.Function.html) construct for each route;

Most of these CDK constructs are exposed as properties of the `Api` construct.
- `api.httpApi` gives you the `HttpApi`;
- `api.apiGatewayDomain` gives you the `DomainName`;
- `api.acmCertificate` gives you the `Certificate`;

## Using CloudFormation constructs

If neither SST or CDK have a construct for the resource you are trying to create, you can fall back to using the CFN constructs. CFN cosntructs are exactly the resources defined by CloudFormation. You must provide the resource's required configuration yourself, similar to as if you were writing CloudFormation yaml template.

Here is an example of creating an S3 bucket using the `CfnBucket` construct.

```js
import { CfnBucket } from "@aws-cdk/aws-s3";

const cfnBucket = new CfnBucket(this, "Bucket");
```
