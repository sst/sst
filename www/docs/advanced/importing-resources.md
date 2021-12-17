---
title: Importing Resources 🟢
description: "Referencing existing resources in your SST app"
---

If there are existing resources in your AWS account you'd like to use, you can reference them in your app. To do that, many of the CDK Constructs support fromXXX() methods.  Here are a couple of examples.

## Using an existing VPC for Lambda Functions

```js {3,6}
import * as ec2 from "@aws-cdk/aws-ec2";

const vpc = ec2.Vpc.fromLookup(this, 'ExistingVPC', { isDefault: true });

new Api(this, "Api", {
  defaultFunctionProps: { vpc },
  routes: {
    "GET /": "src/lambda.main",
  },
});
```

## Adding routes to an existing HTTP API

```js {4-6}
import { HttpApi } from "@aws-cdk/aws-apigatewayv2";

new Api(this, "Api", {
  httpApi: HttpApi.fromHttpApiAttributes(this, "ExistingApi", {
    httpApiId,
  }),
  routes: {
    "GET /new": "src/lambda.main",
  },
});
```

## Adding subscribers to an existing SNS Topic

```js {4}
import * as sns from "@aws-cdk/aws-sns";

new Topic(this, "Topic", {
  snsTopic: sns.Topic.fromTopicArn(this, "ExistingTopic", topicArn),
  subscribers: ["src/subscriber1.main", "src/subscriber2.main"],
});
```

## Limitations

In general, most SST constructs support using existing AWS resources. You can find an example in each construct's doc. However, the following limitations should be noted:

- [`Bucket`](../constructs/Bucket.md) does not support adding notifications to existing S3 Buckets;
- [`Auth`](../constructs/Auth.md) does not support configuring triggers to existing Cognito User Pool.

