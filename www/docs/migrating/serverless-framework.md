---
title: Migrating From Serverless Framework
sidebar_label: Serverless Framework
description: "Migrate your from Serverless Framework app to SST."
---

import HeadlineText from "@site/src/components/HeadlineText";

<HeadlineText>

A guide to migrating your Serverless Framework app to SST.

</HeadlineText>

---

This document is a work in progress. If you have experience migrating your Serverless Framework app to SST, please consider contributing.

## Incrementally Adopting SST

SST has been designed to be incrementally adopted. This means that you can continue using your existing Serverless Framework app while slowly moving over resources to SST. By starting small and incrementally adding more resources, you can avoid a wholesale rewrite.

Let's assume you have an existing Serverless Framework app. To get started, we'll first set up a new SST project in the same directory.

### A hybrid Serverless Framework and SST app

To make it an easier transition, we'll start by merging your existing Serverless Framework app with a newly created SST app.

Your existing app can either have one service or be a monorepo with multiple services.

1. In a temporary location, run `npm init sst`
2. Copy the `sst.json` file and the `src/` and `stacks/` directories.
3. Copy the `scripts`, `dependencies`, and `devDependencies` from the `package.json` file in the new SST project root.
4. Copy the `.gitignore` file and append it to your existing `.gitignore` file.
5. If you are using TypeScript, you can also copy the `tsconfig.json`.
6. Run `npm install`.

Now your directory structure should look something like this. The `src/` directory is where all the Lambda functions in your Serverless Framework app are placed.

```
serverless-app
├── node_modules
├── .gitignore
├── package.json
├── serverless.yml
├── sst.json
├── stacks
|   ├── MyStack.js
|   └── index.js
└── src
    ├── lambda1.js
    └── lambda2.js
```

And from your project root you can run both the Serverless Framework and SST commands.

This also allows you to easily create functions in your new SST app by pointing to the handlers in your existing app.

Say you have a Lambda function defined in your `serverless.yml`.

```yml title="serverless.yml"
functions:
  hello:
    handler: src/lambda1.main
```

You can now create a function in your SST app using the same source.

```js title="SST"
new sst.Function(stack, "MySnsLambda", {
  handler: "src/lambda1.main",
});
```

### Monorepo with multiple Serverless Framework services

If you have multiple Serverless Framework services in the same repo, you can still follow the steps above to create a single SST app. This is because you can define multiple stacks in the same SST app. Whereas each Serverless Framework service can only contain a single stack.

After the SST app is created, your directory structure should look something like this.

```
serverless-app
├── node_modules
├── .gitignore
├── package.json
├── sst.json
├── stacks
|   ├── MyStack.js
|   └── index.js
└── services
    ├── serviceA
    |   ├── serverless.yml
    |   ├── lambda1.js
    |   └── lambda2.js
    └── serviceB
        ├── serverless.yml
        ├── lambda3.js
        └── lambda4.js
```

The `src/` directory is where all the Lambda functions in your Serverless Framework app are placed.

### Add new services to SST

Next, if you need to add a new service or resource to your Serverless Framework app, you can instead do it directly in SST.

For example, say you want to add a new SQS queue resource.

1. Start by creating a new stack in the `stacks/` directory. Something like, `stacks/MyNewQueueService.js`.
2. Add the new stack to the list in `stacks/index.js`.

### Reference stack outputs

Now that you have two separate apps side-by-side, you might find yourself needing to reference stack outputs between each other.

#### Reference a Serverless Framework stack output in SST

To reference a Serverless Framework stack output in SST, you can use the [`cdk.Fn.import_value`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.Fn.html#static-importwbrvaluesharedvaluetoimport) function.

For example:

```js
// This imports an S3 bucket ARN and sets it as an environment variable for
// all the Lambda functions in the new API.
import { Fn } from "aws-cdk-lib";

new sst.Api(stack, "MyApi", {
  defaults:
    function: {
      environment: {
        myKey: Fn.importValue("exported_key_in_serverless_framework")
      }
    }
  },
  routes: {
    "GET    /notes"      : "src/list.main",
    "POST   /notes"      : "src/create.main",
    "GET    /notes/{id}" : "src/get.main",
    "PUT    /notes/{id}" : "src/update.main",
    "DELETE /notes/{id}" : "src/delete.main",
  }
});
```

#### Reference SST stack outputs in Serverless Framework

You might also want to reference a newly created resource in SST in Serverless Framework.

```js title="SST"
// Export in an SST stack
stack.addOutputs({
  TableName: {
    value: bucket.bucketArn,
    exportName: "MyBucketArn",
  },
});
```

```js title="Serverless Framework"
// Importing in serverless.yml
!ImportValue MyBucketArn
```

#### Referencing SST stack outputs in other SST stacks

And finally, to reference stack outputs across stacks in your SST app.

```js title="StackA.js"
import { StackContext, Bucket } from "sst/constructs";

export function StackA({ stack }: StackContext) {
  const bucket = new s3.Bucket(stack, "MyBucket");

  return { bucket };
}
```

```js title="StackB.js"
import { StackContext, use } from "sst/constructs";
import { StackA } from "./StackA";

export function StackB({ stack }: StackContext) {
  // stackA's return value is passed to stackB
  const { bucket } = use(StackA);

  // SST will implicitly set the exports in stackA
  // and imports in stackB
  bucket.bucketArn;
}
```

### Reference Serverless Framework resources

The next step would be to use the resources that are created in your Serverless Framework app. You can reference them directly in your SST app, so you don't have to recreate them.

For example, if you've already created an SNS topic in your Serverless Framework app, and you want to add a new function to subscribe to it:

```js
import { Topic } from "aws-cdk-lib/aws-sns";

// Lookup the existing SNS topic
const snsTopic = Topic.fromTopicArn(
  stack,
  "ImportTopic",
  "arn:aws:sns:us-east-2:444455556666:MyTopic"
);

// Add 2 new subscribers
new sst.Topic(stack, "MyTopic", {
  snsTopic,
  subscribers: {
    subscriber1: "src/subscriber1.main",
    subscriber2: "src/subscriber2.main",
  },
});
```

### Migrate existing services to SST

There are a couple of strategies if you want to migrate your Serverless Framework resources to your SST app.

#### Proxying

This applies to API endpoints and it allows you to incrementally migrate API endpoints to SST.

:::note
Support for this strategy hasn't been implemented in SST yet.
:::

Suppose you have a couple of routes in your `serverless.yml`.

```yaml
functions:
  usersList:
    handler: src/usersList.main
    events:
      - httpApi:
          method: GET
          path: /users

  usersGet:
    handler: src/usersGet.main
    events:
      - httpApi:
          method: GET
          path: /users/{userId}
```

And you are ready to migrate the `/users` endpoint but don't want to touch the other endpoints yet.

You can add the route you want to migrate, and set a catch all route to proxy requests the rest to the old API.

```js
const api = new sst.Api(stack, "Api", {
  routes: {
    "GET /users": "src/usersList.main",
    // "$default"   : proxy to old api,
  },
});
```

Now you can use the new API endpoint in your frontend application. And remove the old route from the Serverless Framework app.

#### Resource swapping

This is suitable for migrating resources that don't have persistent data. So, SNS topics, SQS queues, and the like.

Imagine you have an existing SNS topic named `MyTopic`.

1. Create a new topic in SST called `MyTopic.sst` and add a subscriber with the same function code.

2. Now in your app, start publishing to the `MyTopic.sst` instead of `MyTopic`.

3. Remove the old `MyTopic` resource from the Serverless Framework app.

Optionally, you can now create another new topic in SST called `MyTopic` and follow the steps above to remove the temporary `MyTopic.sst` topic.

#### Migrate only the functions

Now for resources that have persistent data like DynamoDB and S3, it won't be possible to remove them and recreate them. For these cases you have two choices:

1. Use them as-is by referencing them
2. Or, migrate them over

We talk about this in detail over on our doc on [Importing resources](../advanced/importing-resources.md).

Here's an example of referencing a resource for DynamoDB streams. Assume you have a DynamoDB table that is named based on the stage it's deployed to.

```yml title="serverless.yml"
resources:
  Resources:
    MyTable:
      Type: AWS::DynamoDB::Table
          Properties:
            TableName: ${self:custom.stage}-MyTable
            AttributeDefinitions:
              - AttributeName: userId
                AttributeType: S
              - AttributeName: noteId
                AttributeType: S
            KeySchema:
              - AttributeName: userId
                KeyType: HASH
              - AttributeName: noteId
                KeyType: RANGE
            BillingMode: 'PAY_PER_REQUEST'
            StreamSpecification:
              StreamViewType: NEW_IMAGE
```

Now in SST, you can reference the table and create an SST function to subscribe to its streams.

```js
// Import table
const table = dynamodb.fromTableName(
  stack,
  "MyTable",
  `${this.node.root.stage}-MyTable`
);

// Create a Lambda function
const processor = new sst.Function(stack, "Processor", "processor.main");

// Subscribe function to the streams
processor.addEventSource(
  new DynamoEventSource(table, {
    startingPosition: lambda.StartingPosition.TRIM_HORIZON,
  })
);
```

If you want to completely migrate over a resource, it is a manual process but it'll give you full control. You can [follow these steps](../advanced/importing-resources.md#migrate-resources).

## Workflow

A lot of the commands that you are used to using in Serverless Framework translate well to SST.

| Serverless Framework      | SST          |
| ------------------------- | ------------ |
| `serverless invoke local` | `sst dev`    |
| `serverless package`      | `sst build`  |
| `serverless deploy`       | `sst deploy` |
| `serverless remove`       | `sst remove` |

SST also supports the `IS_LOCAL` environment variable that gets set in your Lambda functions when run locally.

### Invoking locally

With the Serverless Framework you need to run the following command `serverless invoke local -f function_name` to invoke a function locally.

With SST this can be done via PostMan, Hopscotch, curl or any other API client. However, with this event you are actually sending a request to API Gateway which then invokes your Lambda.

## CI/CD

If you are using GitHub Actions, Circle CI, etc., to deploy Serverless Framework apps, you can now add the SST versions to your build scripts.

```bash
# Deploy the defaults
npx sst deploy

# To a specific stage
npx sst deploy --stage prod

# To a specific stage and region
npx sst deploy --stage prod --region us-west-1

# With a different AWS profile
AWS_PROFILE=production npx sst deploy --stage prod --region us-west-1
```

## Serverless Dashboard

If you are using the Serverless Dashboard, you can try out [Seed](https://seed.run) instead. It supports Serverless Framework and SST. So you can deploy the hybrid app that we've created here.

Seed has a fully-managed CI/CD pipeline, monitoring, real-time alerts, and deploys a lot faster thanks to the [Incremental Deploys](https://seed.run/docs/what-are-incremental-deploys). It also gives you a great birds eye view of all your environments.

## Lambda Function Triggers

Following is a list of all the Lambda function triggers available in Serverless Framework. And the support status in SST (or CDK).

| Type                   | Status                             |
| ---------------------- | ---------------------------------- |
| HTTP API               | [Available](#http-api)             |
| API Gateway REST API   | [Available](#api-gateway-rest-api) |
| WebSocket API          | [Available](#websocket)            |
| Schedule               | [Available](#schedule)             |
| SNS                    | [Available](#sns)                  |
| SQS                    | [Available](#sqs)                  |
| DynamoDB               | [Available](#dynamodb)             |
| Kinesis                | [Available](#kinesis)              |
| S3                     | [Available](#s3)                   |
| CloudWatch Events      | [Available](#cloudwatch-events)    |
| CloudWatch Logs        | [Available](#cloudwatch-logs)      |
| EventBus Event.        | [Available](#eventbus-event)       |
| EventBridge Event      | [Available](#eventbridge-event)    |
| Cognito User Pool      | [Available](#cognito-user-pool)    |
| ALB                    | Available                          |
| Alexa Skill            | Available                          |
| Alexa Smart Home       | Available                          |
| IoT                    | Available                          |
| CloudFront             | _Coming soon_                      |
| IoT Fleet Provisioning | _Coming soon_                      |
| Kafka                  | _Coming soon_                      |
| MSK                    | _Coming soon_                      |

## Plugins

Serverless Framework supports a long list of popular plugins. In this section we'll look at how to adopt their functionality to SST.

To start with, let's look at the very popular [serverless-offline](https://github.com/dherault/serverless-offline) plugin. It's used to emulate a Lambda function locally but it's fairly limited in the workflows it supports. There are also a number of other plugins that work with serverless-offline to support various other Lambda triggers.

Thanks to `sst dev`, you don't need to worry about using them anymore.

| Plugin                                                                                                                    | Alternative |
| ------------------------------------------------------------------------------------------------------------------------- | ----------- |
| [serverless-offline](https://github.com/dherault/serverless-offline)                                                      | `sst dev`   |
| [serverless-offline-sns](https://github.com/mj1618/serverless-offline-sns)                                                | `sst dev`   |
| [serverless-offline-ssm](https://github.com/janders223/serverless-offline-ssm)                                            | `sst dev`   |
| [serverless-dynamodb-local](https://github.com/99x/serverless-dynamodb-local)                                             | `sst dev`   |
| [serverless-offline-scheduler](https://github.com/ajmath/serverless-offline-scheduler)                                    | `sst dev`   |
| [serverless-step-functions-offline](https://github.com/vkkis93/serverless-step-functions-offline)                         | `sst dev`   |
| [serverless-offline-direct-lambda](https://github.com/civicteam/serverless-offline-direct-lambda)                         | `sst dev`   |
| [CoorpAcademy/serverless-plugins](https://github.com/CoorpAcademy/serverless-plugins)                                     | `sst dev`   |
| [serverless-plugin-offline-dynamodb-stream](https://github.com/orchestrated-io/serverless-plugin-offline-dynamodb-stream) | `sst dev`   |

Let's look at the other popular Serverless Framework plugins and how to set them up in SST.

| Plugin                                                                                                          | Status                                                                                     |
| --------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| [serverless-webpack](https://github.com/serverless-heaven/serverless-webpack)                                   | SST uses esbuild to automatically bundle your functions                                    |
| [serverless-domain-manager](https://github.com/amplify-education/serverless-domain-manager)                     | [`sst.Api` supports custom domains](#serverless-domain-manager)                            |
| [serverless-pseudo-parameters](https://github.com/svdgraaf/serverless-pseudo-parameters)                        | [CloudFormation pseudo parameters are not necessary in CDK](#serverless-pseudo-parameters) |
| [serverless-step-functions](https://github.com/serverless-operations/serverless-step-functions)                 | [Available in CDK](#serverless-step-functions)                                             |
| [serverless-plugin-aws-alerts](https://github.com/ACloudGuru/serverless-plugin-aws-alerts)                      | [Available in CDK](#serverless-plugin-aws-alerts)                                          |
| [serverless-plugin-typescript](https://github.com/graphcool/serverless-plugin-typescript)                       | SST natively supports TypeScript                                                           |
| [serverless-apigw-binary](https://github.com/maciejtreder/serverless-apigw-binary)                              | Available in CDK                                                                           |
| [serverless-plugin-tracing](https://github.com/alex-murashkin/serverless-plugin-tracing)                        | Supported by SST                                                                           |
| [serverless-aws-documentation](https://github.com/deliveryhero/serverless-aws-documentation)                    | _Coming soon_                                                                              |
| [serverless-dotenv-plugin](https://github.com/infrontlabs/serverless-dotenv-plugin)                             | _Coming soon_                                                                              |
| [serverless-plugin-split-stacks](https://github.com/dougmoscrop/serverless-plugin-split-stacks)                 | _Coming soon_                                                                              |
| [serverless-plugin-include-dependencies](https://github.com/dougmoscrop/serverless-plugin-include-dependencies) | _Coming soon_                                                                              |
| [serverless-iam-roles-per-function](https://github.com/functionalone/serverless-iam-roles-per-function)         | Supported by SST                                                                           |
| [serverless-plugin-monorepo](https://github.com/Butterwire/serverless-plugin-monorepo)                          | SST supports monorepo setups automatically                                                 |
| [serverless-log-forwarding](https://github.com/amplify-education/serverless-log-forwarding)                     | Available in CDK                                                                           |
| [serverless-plugin-lambda-dead-letter](https://github.com/gmetzker/serverless-plugin-lambda-dead-letter)        | Available in CDK                                                                           |
| [serverless-plugin-stage-variables](https://github.com/svdgraaf/serverless-plugin-stage-variables)              | Available in CDK                                                                           |
| [serverless-stack-output](https://github.com/sbstjn/serverless-stack-output)                                    | Supported by SST                                                                           |
| [serverless-plugin-scripts](https://github.com/mvila/serverless-plugin-scripts)                                 | _Coming soon_                                                                              |
| [serverless-finch](https://github.com/fernando-mc/serverless-finch)                                             | Available in CDK                                                                           |
| [serverless-stage-manager](https://github.com/jeremydaly/serverless-stage-manager)                              | [Supported by SST](#serverless-stage-manager)                                              |
| [serverless-plugin-log-subscription](https://github.com/dougmoscrop/serverless-plugin-log-subscription)         | Available in CDK                                                                           |
| [serverless-plugin-git-variables](https://github.com/jacob-meacham/serverless-plugin-git-variables)             | Available in CDK                                                                           |
| [serverless-dynamodb-autoscaling](https://github.com/sbstjn/serverless-dynamodb-autoscaling)                    | Available in CDK                                                                           |
| [serverless-aws-alias](https://github.com/serverless-heaven/serverless-aws-alias)                               | Available in CDK                                                                           |
| [serverless-s3-remover](https://github.com/sinofseven/serverless-s3-remover)                                    | _Coming soon_                                                                              |
| [serverless-s3-sync](https://github.com/k1LoW/serverless-s3-sync)                                               | _Coming soon_                                                                              |
| [serverless-appsync-plugin](https://github.com/sid88in/serverless-appsync-plugin)                               | Available in CDK                                                                           |
| [serverless-scriptable-plugin](https://github.com/weixu365/serverless-scriptable-plugin)                        | _Coming soon_                                                                              |
| [serverless-mysql](https://github.com/jeremydaly/serverless-mysql)                                              | _Coming soon_                                                                              |
| [serverless-plugin-canary-deployments](https://github.com/davidgf/serverless-plugin-canary-deployments)         | _Coming soon_                                                                              |
| [serverless-prune-plugin](https://github.com/claygregory/serverless-prune-plugin)                               | _Coming soon_                                                                              |

## Examples

A list of examples showing how to use Serverless Framework triggers or plugins in SST.

### Triggers

#### HTTP API

```yml title="serverless.yml"
functions:
  listUsers:
    handler: listUsers.main
    events:
      - httpApi:
          method: GET
          path: /users

  createUser:
    handler: createUser.main
    events:
      - httpApi:
          method: POST
          path: /users

  getUser:
    handler: getUser.main
    events:
      - httpApi:
          method: GET
          path: /users/{id}
```

```js title="SST"
new Api(stack, "Api", {
  routes: {
    "GET    /users": "listUsers.main",
    "POST   /users": "createUser.main",
    "GET    /users/{id}": "getUser.main",
  },
});
```

#### API Gateway REST API

```yml title="serverless.yml"
functions:
  listUsers:
    handler: listUsers.main
    events:
      - http:
          method: GET
          path: /users

  createUser:
    handler: createUser.main
    events:
      - http:
          method: POST
          path: /users

  getUser:
    handler: getUser.main
    events:
      - http:
          method: GET
          path: /users/{id}
```

```js title="SST"
new ApiGatewayV1Api(stack, "Api", {
  routes: {
    "GET    /users": "listUsers.main",
    "POST   /users": "createUser.main",
    "GET    /users/{id}": "getUser.main",
  },
});
```

#### WebSocket

```yml title="serverless.yml"
functions:
  connectHandler:
    handler: connect.main
    events:
      - websocket: $connect

  disconnectHandler:
    handler: disconnect.main
    events:
      - websocket:
          route: $disconnect

  defaultHandler:
    handler: default.main
    events:
      - websocket:
          route: $default

  sendMessageHandler:
    handler: sendMessage.main
    events:
      - websocket:
          route: sendMessage
```

```js title="SST"
new WebSocketApi(stack, "Api", {
  routes: {
    $connect: "src/connect.main",
    $default: "src/default.main",
    $disconnect: "src/disconnect.main",
    sendMessage: "src/sendMessage.main",
  },
});
```

#### Schedule

```yml title="serverless.yml"
functions:
  crawl:
    handler: crawl.main
    events:
      - schedule: rate(2 hours)
```

```js title="SST"
new Cron(stack, "Crawl", {
  schedule: "rate(2 hours)",
  job: "crawl.main",
});
```

#### SNS

```yml title="serverless.yml"
functions:
  subscriber:
    handler: subscriber.main
    events:
      - sns: dispatch
  subscriber2:
    handler: subscriber2.main
    events:
      - sns: dispatch
```

```js title="SST"
new Topic(stack, "Dispatch", {
  subscribers: {
    subscriber1: "subscriber.main",
    subscriber2: "subscriber2.main",
  },
});
```

#### SQS

```yml title="serverless.yml"
functions:
  consumer:
    handler: consumer.main
    events:
      - sqs:
          arn:
            Fn::GetAtt:
              - MyQueue
              - Arn

resources:
  Resources:
    MyQueue:
      Type: "AWS::SQS::Queue"
      Properties:
        QueueName: ${self:custom.stage}-MyQueue
```

```js title="SST"
new Queue(stack, "MyQueue", {
  consumer: "consumer.main",
});
```

#### DynamoDB

```yml title="serverless.yml"
functions:
  processor:
    handler: processor.main
    events:
      - stream:
          type: dynamodb
          arn:
            Fn::GetAtt:
              - MyTable
              - StreamArn

resources:
  Resources:
    MyTable:
      Type: AWS::DynamoDB::Table
          Properties:
            TableName: ${self:custom.stage}-MyTable
            AttributeDefinitions:
              - AttributeName: userId
                AttributeType: S
              - AttributeName: noteId
                AttributeType: S
            KeySchema:
              - AttributeName: userId
                KeyType: HASH
              - AttributeName: noteId
                KeyType: RANGE
            BillingMode: 'PAY_PER_REQUEST'
            StreamSpecification:
              StreamViewType: NEW_AND_OLD_IMAGES
```

```js title="SST"
new Table(stack, "MyTable", {
  fields: {
    userId: TableFieldType.STRING,
    noteId: TableFieldType.STRING,
  },
  primaryIndex: { partitionKey: "noteId", sortKey: "userId" },
  stream: true,
  consumers: {
    myConsumer: "processor.main",
  }
});
```

#### Kinesis

```yml title="serverless.yml"
functions:
  processor:
    handler: processor.main
    events:
      - stream:
          type: kinesis
          arn:
            Fn::Join:
              - ":"
              - - arn
                - aws
                - kinesis
                - Ref: AWS::Region
                - Ref: AWS::AccountId
                - stream/MyKinesisStream
```

```js title="SST"
new KinesisStream(stack, "MyStream", {
  consumers: {
    myConsumer: "processor.main",
  }
});
```

#### S3

```yml title="serverless.yml"
functions:
  processor:
    handler: processor.main
    events:
      - s3:
          bucket: MyBucket
          event: s3:ObjectCreated:*
          rules:
            - prefix: uploads/
```

```js title="SST"
new Bucket(stack, "MyBucket", {
  notifications: {
    myNotification: {
      function: "notification.main",
      events: ["object_created"],
      filters: [{ prefix: "uploads/" }],
    }
  }
});
```

#### CloudWatch Events

```yml title="serverless.yml"
functions:
  myCloudWatch:
    handler: myCloudWatch.handler
    events:
      - cloudwatchEvent:
          event:
            source:
              - "aws.ec2"
            detail-type:
              - "EC2 Instance State-change Notification"
            detail:
              state:
                - pending
```

```js title="SST"
const processor = new sst.Function(stack, "Processor", "processor.main");
const rule = new events.Rule(stack, "Rule", {
  eventPattern: {
    source: ["aws.ec2"],
    detailType: ["EC2 Instance State-change Notification"],
  },
});
rule.addTarget(new targets.LambdaFunction(processor));
```

#### CloudWatch Logs

```yml title="serverless.yml"
functions:
  processor:
    handler: processor.main
    events:
      - cloudwatchLog:
          logGroup: "/aws/lambda/hello"
          filter: "{$.error = true}"
```

```js title="SST"
const processor = new sst.Function(stack, "Processor", "processor.main");
new SubscriptionFilter(stack, "Subscription", {
  logGroup,
  destination: new LogsDestinations.LambdaDestination(processor),
  filterPattern: FilterPattern.booleanValue("$.error", true),
});
```

#### EventBus Event

```yml title="serverless.yml"
functions:
  myFunction:
    handler: processor.main
    events:
      - eventBridge:
          eventBus:
            Fn::GetAtt:
              - MyEventBus
              - Arn
          pattern:
            source:
              - acme.transactions.xyz

resources:
  Resources:
    MyEventBus:
      Type: AWS::Events::EventBus
      Properties:
        Name: MyEventBus
```

```js title="SST"
const processor = new sst.Function(stack, "Processor", "processor.main");
const rule = new events.Rule(stack, "MyEventRule", {
  eventBus: new events.EventBus(stack, "MyEventBus"),
  eventPattern: {
    source: ["acme.transactions.xyz"],
  },
});
rule.addTarget(new targets.LambdaFunction(processor));
```

#### EventBridge Event

```yml title="serverless.yml"
functions:
  myFunction:
    handler: processor.main
    events:
      - eventBridge:
          pattern:
            source:
              - aws.cloudformation
            detail-type:
              - AWS API Call via CloudTrail
            detail:
              eventSource:
                - cloudformation.amazonaws.com
```

```js title="SST"
const processor = new sst.Function(stack, "Processor", "processor.main");
const rule = new events.Rule(stack, "rule", {
  eventPattern: {
    source: ["aws.cloudformation"],
    detailType: ["AWS API Call via CloudTrail"],
    detail: {
      eventSource: ["cloudformation.amazonaws.com"],
    },
  },
});
rule.addTarget(new targets.LambdaFunction(processor));
```

#### Cognito User Pool

```yml title="serverless.yml"
functions:
  preSignUp:
    handler: preSignUp.main
    events:
      - cognitoUserPool:
          pool: MyUserPool
          trigger: PreSignUp
          existing: true
```

```js title="SST"
new Cognito(stack, "Auth", {
  triggers: {
    preSignUp: "src/preSignUp.main",
  },
});
```

### Plugins

#### serverless-domain-manager

```yml title="serverless.yml"
plugins:
  - serverless-domain-manager

custom:
  customDomain:
    domainName: api.domain.com

function:
  listUsers:
    handler: src/listUsers.main
    events:
      - httpApi:
          method: GET
          path: /users
```

```js title="SST"
new Api(stack, "Api", {
  customDomain: "api.domain.com",
  routes: {
    "GET /users": "src/listUsers.main",
  },
});
```

#### serverless-pseudo-parameters

```yml title="serverless.yml"
plugins:
  - serverless-pseudo-parameters

resources:
  Resources:
    S3Bucket:
      Type: AWS::S3::Bucket,
      DeleteionPolicy: Retain
      Properties:
        BucketName: photos-#{AWS::AccountId}
```

```js title="SST"
new s3.Bucket(stack, "S3Bucket", {
  bucketName: `photos-${stack.account}`
};
```

#### serverless-step-functions

```yml title="serverless.yml"
plugins:
  - serverless-step-functions

functions:
  hello:
    handler: hello.main

StartAt: Wait
States:
  Wait:
    Type: Wait
    Seconds: 300
    Next: Hello
  Hello:
    Type: Task
    Resource:
      Fn::GetAtt:
        - hello
        - Arn
    Next: Decide
  Decide:
    Type: Choice
    Choices:
      - Variable: $.status
        StringEquals: Approved
        Next: Success
    Default: Failed
  Success:
    Type: Succeed
  Failed:
    Type: Fail
```

```js title="SST"
// Define each state
const sWait = new sfn.Wait(stack, "Wait", {
  time: sfn.WaitTime.duration(cdk.Duration.seconds(300)),
});
const sHello = new tasks.LambdaInvoke(stack, "Hello", {
  lambdaFunction: new sst.Function(stack, "Hello", "hello.main"),
});
const sFailed = new sfn.Fail(stack, "Failed");
const sSuccess = new sfn.Succeed(stack, "Success");

// Define state machine
new sfn.StateMachine(stack, "StateMachine", {
  definition: sWait
    .next(sHello)
    .next(
      new sfn.Choice(stack, "Job Approved?")
        .when(sfn.Condition.stringEquals("$.status", "Approved"), sSuccess)
        .otherwise(sFailed)
    ),
});
```

#### serverless-plugin-aws-alerts

```yml title="serverless.yml"
plugins:
  - serverless-plugin-aws-alerts

custom:
  alerts:
    stages:
      - production
    topics:
      alarm:
        topic: ${self:service}-${opt:stage}-alerts-alarm
        notifications:
          - protocol: email
            endpoint: foo@bar.com
    alarms:
      - functionErrors
```

```js title="SST"
// Send an email when a message is received
const topic = new sns.Topic(stack, "AlarmTopic");
topic.addSubscription(new subscriptions.EmailSubscription("foo@bar.com"));

// Post a message to topic when an alarm breaches
new cloudwatch.Alarm(stack, "Alarm", {
  metric: lambda.metricAllErrors(),
  threshold: 100,
  evaluationPeriods: 2,
});
alarm.addAlarmAction(new cloudwatchActions.SnsAction(topic));
```

#### serverless-stage-manager

```yml title="serverless.yml"
plugins:
  - serverless-stage-manager

custom:
  stages:
    - dev
    - staging
    - prod
```

```js title="SST"
if (!["dev", "staging", "prod"].includes(app.stage)) {
  throw new Error("Invalid stage");
}
```
