---
title: Importing Resources
description: "Learn how to reference existing resources in your SST app."
---

You might have some existing resources in your AWS account that you'd like to use in your SST app. To reference them, you can use the `fromXXX()` methods that most CDK Constructs support . Here are a couple of examples of it in action.

### Using an existing VPC for Lambda Functions

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

### Adding routes to an existing HTTP API

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

### Adding subscribers to an existing SNS Topic

```js {4}
import * as sns from "@aws-cdk/aws-sns";

new Topic(this, "Topic", {
  snsTopic: sns.Topic.fromTopicArn(this, "ExistingTopic", topicArn),
  subscribers: ["src/subscriber1.main", "src/subscriber2.main"],
});
```

## Limitations

In general, most SST constructs support using existing AWS resources. You can find examples in the doc for the construct. However, the following AWS limitations should be noted:

- [`Cognito`](../constructs/Cognito.md) does not support configuring triggers to existing Cognito User Pools.
