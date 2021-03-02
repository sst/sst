---
title: Migrating From Serverless Framework
description: "Migrating from Serverless Framework to Serverless Stack (SST)"
---

In this guide we'll look at how to migrate a Serverless Framework app to SST.

Note that, this document is a work in progress. If you have experience migrating your Serverless Framework app to SST, please consider contributing.

## Incrementally Adopting SST

SST has been designed to be incrementally adopted. This means that you can continue using your existing Serverless Framework app while slowly moving over resources to SST. By starting small and incrementally adding more resources, you can avoid a wholesale rewrite.

Let's assume you have an existing Serverless Framework app. To get started, we'll first set up a new SST project in the same directory.

### A hybrid Serverless Framework and SST app

To make it an easier transition, we'll start by merging your existing Serverless Framework app with a newly created SST app.

Your existing app can either have one service or be a monorepo with multiple services.

1. In a temporary location, run `npx create-serverless-stack@latest my-sst-app` or use the `--language typescript` option if your project is in TypeScript.
2. Copy the `sst.json` file and the `src/` and `lib/` directories.
3. Copy the `scripts`, `dependencies`, and `devDependencies` from the `package.json` file in the new SST project root.
4. Copy the `.gitnore` file and append it to your existing `.gitignore` file.
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
├── lib
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

```js title="MyStack.js"
new sst.Function(this, "MySnsLambda", {
  handler: "src/lambda1.main",
});
```

### Add new services to SST

Next, if you need to add a new service or resource to your Serverless Framework app, you can instead do it directly in SST.

For example, say you want to add a new SQS queue resource.

1. Start by creating a new stack in the `lib/` directory. Something like, `lib/MyNewQueueService.js`.
2. Add the new stack to the list in `lib/index.js`.

### Reference stack outputs

Now that you have two separate apps side-by-side, you might find yourself needing to reference stack outputs between each other.

#### Reference a Serverless Framework stack output in SST

To reference a Serverless Framework stack output in SST, you can use the [`cdk.Fn.import_value`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_core.Fn.html#static-importwbrvaluesharedvaluetoimport) function.

For example:

```js
// This imports an S3 bucket ARN and sets it as an environment variable for
// all the Lambda functions in the new API.
new sst.Api(this, "MyApi", {
	defaultFunctionProps:
		environment: {
		  myKey: cdk.Fn.import_value("exported_key_in_serverless_framework")
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
new CfnOutput(this, "TableName", {
  value: bucket.bucketArn,
  exportName: "MyBucketArn",
});
```

```js title="Serverless Framework"
// Importing in serverless.yml
!ImportValue MyBucketArn
```

#### Referencing SST stack outputs in other SST stacks

And finally, to reference stack outputs across stacks in your SST app.

```js title="StackA.js"
this.bucket = new s3.Bucket(this, "MyBucket");
```

```js title="StackB.js"
// stackA's bucket is passed to stackB
const { bucket } = this.props;
// SST will implicitly set the exports in stackA
// and imports in stackB
bucket.bucketArn;
```

### Reference Serverless Framework resources

The next step would be to use the resources that are created in your Serverless Framework app. You can reference them directly in your SST app, so you don't have to recreate them.

For example, if you've already created an SNS topic in your Serverless Framework app, and you want to add a new function to subscribe to it:

```js
import { Topic } from "@aws-cdk/aws-sns";

// Lookup the existing SNS topic
const snsTopic = Topic.fromTopicArn(
  this,
  "ImportTopic",
  "arn:aws:sns:us-east-2:444455556666:MyTopic"
);

// Add 2 new subscribers
new sst.Topic(this, "MyTopic", {
  snsTopic,
  subscribers: ["src/subscriber1.main", "src/subscriber2.main"],
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
const api = new sst.Api(this, "Api", {
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

Now for resources that have persistent data like DynamoDB and S3, it won't be possible to remove them and recreate them. For these cases you can leave them as-is, while migrating over the DynamoDB stream subscribers and S3 bucket event subscribers as a first step.

Here's an example for DynamoDB streams. Assume you have a DynamoDB table that is named based on the stage it's deployed to.

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

Now in SST, you can import the table and create an SST function to subscribe to its streams.

```js
// Import table
const table = dynamodb.fromTableName(
  this,
  "MyTable",
  `${this.node.root.stage}-MyTable`
);

// Create a Lambda function
const processor = new sst.Function(this, "Processor", "processor.main");

// Subscribe function to the streams
processor.addEventSource(
  new DynamoEventSource(table, {
    startingPosition: lambda.StartingPosition.TRIM_HORIZON,
  })
);
```

## Workflow

A lot of the commands that you are used to using in Serverless Framework translate well to SST.

| Serverless Framework      | SST          |
| ------------------------- | ------------ |
| `serverless invoke local` | `sst start`  |
| `serverless package`      | `sst build`  |
| `serverless deploy`       | `sst deploy` |
| `serverless remove`       | `sst remove` |

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

| Type                   | Status        |
| ---------------------- | ------------- |
| [Seed](#api)           | Available     |
| Schedule               | Available     |
| SNS                    | Available     |
| SQS                    | Available     |
| DynamoDB               | Available     |
| Kinesis                | Available     |
| S3                     | Available     |
| CloudWatch Events      | Available     |
| CloudWatch Logs        | Available     |
| EventBridge Event      | Available     |
| Cognito User Pool      | Available     |
| WebSocket              | Available     |
| ALB                    | Available     |
| Alexa Skill            | Available     |
| Alexa Smart Home       | Available     |
| IoT                    | Available     |
| CloudFront             | _Coming soon_ |
| IoT Fleet Provisioning | _Coming soon_ |
| Kafka                  | _Coming soon_ |
| MSK                    | _Coming soon_ |

## Plugins

Serverless Framework supports a long list of popular plugins. In this section we'll look at how to adopt their functionality to SST.

To start with, let's look at the very popular [serverless-offline](https://github.com/dherault/serverless-offline) plugin. It's used to emulate a Lambda function locally but it's fairly limited in the workflows it supports. There are also a number of other plugins that work with serverless-offline to support various other Lambda triggers.

Thanks to `sst start`, you don't need to worry about using them anymore.

| Plugin                                                                                                                    | Alternative |
| ------------------------------------------------------------------------------------------------------------------------- | ----------- |
| [serverless-offline](https://github.com/dherault/serverless-offline)                                                      | `sst start` |
| [serverless-offline-sns](https://github.com/mj1618/serverless-offline-sns)                                                | `sst start` |
| [serverless-offline-ssm](https://github.com/janders223/serverless-offline-ssm)                                            | `sst start` |
| [serverless-dynamodb-local](https://github.com/99x/serverless-dynamodb-local)                                             | `sst start` |
| [serverless-offline-scheduler](https://github.com/ajmath/serverless-offline-scheduler)                                    | `sst start` |
| [serverless-step-functions-offline](https://github.com/vkkis93/serverless-step-functions-offline)                         | `sst start` |
| [serverless-offline-direct-lambda](https://github.com/civicteam/serverless-offline-direct-lambda)                         | `sst start` |
| [CoorpAcademy/serverless-plugins](https://github.com/CoorpAcademy/serverless-plugins)                                     | `sst start` |
| [serverless-plugin-offline-dynamodb-stream](https://github.com/orchestrated-io/serverless-plugin-offline-dynamodb-stream) | `sst start` |

Let's look at the other popular Serverless Framework plugins and how to set them up in SST.

| Plugin                                                                                          | Status                                                    |
| ----------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| [serverless-webpack](https://github.com/serverless-heaven/serverless-webpack)                   | SST uses esbuild to automatically bundle your functions   |
| [serverless-domain-manager](https://github.com/amplify-education/serverless-domain-manager)     | `sst.Api` supports custom domains                         |
| [serverless-pseudo-parameters](https://github.com/svdgraaf/serverless-pseudo-parameters)        | CloudFormation pseudo parameters are not necessary in CDK |
| [serverless-step-functions](https://github.com/serverless-operations/serverless-step-functions) | Available in CDK                                          |
| [serverless-plugin-aws-alerts](https://github.com/ACloudGuru/serverless-plugin-aws-alerts)      | Available in CDK                                          |
| [serverless-plugin-typescript](https://github.com/graphcool/serverless-plugin-typescript)       | SST natively supports TypeScript                          |
| [serverless-apigw-binary](https://github.com/maciejtreder/serverless-apigw-binary)              | Available in CDK                                          |
| [serverless-plugin-tracing](https://github.com/alex-murashkin/serverless-plugin-tracing)        | Supported by SST                                          |
| [serverless-aws-documentation](https://github.com/deliveryhero/serverless-aws-documentation)    | _Coming soon_                                             |
| [serverless-dotenv-plugin ](https://github.com/infrontlabs/serverless-dotenv-plugin)            | _Coming soon_                                             |

## Examples

### Triggers

#### API

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

```js title="MyStack.js"
new Api(this, "Api", {
  routes: {
    "GET    /users": "listUsers.main",
    "POST   /users": "createUser.main",
    "GET    /users/{id}": "getUser.main",
  },
});
```

### Plugins
