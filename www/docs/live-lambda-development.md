---
id: live-lambda-development
title: Live Lambda Development
description: Live Lambda Development allows you to debug and test your Lambda functions locally, while being invoked remotely by resources in AWS. It works by proxying requests from your AWS account to your local machine.
---

import config from "../config";
import styles from "./video.module.css";
import useBaseUrl from "@docusaurus/useBaseUrl";

Live Lambda Development allows you to debug and test your Lambda functions locally, while being invoked remotely by resources in AWS. It works by proxying requests from your AWS account to your local machine.

<div class={styles.videoWrapper}>
  <iframe width="560" height="315" src="https://www.youtube.com/embed/hnTSTm5n11g" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
</div>

Let's look at how this works in detail.

## Background

Working on Lambda functions locally can be painful. You have to either:

1. Locally mock all the services that your Lambda function uses

   Like API Gateway, SNS, SQS, etc. This is hard to do. If you are using a tool that mocks a specific service (like API Gateway), you won't be able to test a Lambda that's invoked by a different service (like SNS). On the other hand a service like LocalStack, that tries to mock a whole suite of services, is slow and the mocked services can be out of date.

2. Or, you'll need to deploy your changes to test them

   Each deployment can take at least a minute. And repeatedly deploying to test a change really slows down the feedback loop.

## `sst start`

To fix this, we created `sst start`. A local development environment for Lambda. This command does a couple of things:

1. It deploys a _debug stack_ with a WebSocket API to the same AWS account and region as your app.
2. It deploys your app and replaces the Lambda functions with a _stub_ Lambda.
3. Starts up a local WebSocket client to connect to the debug stack.

The debug stack contains an serverless WebSocket API, a DynamoDB table, and a S3 bucket. The stub Lambda when invoked, sends a message to the WebSocket API, which in turn sends a message to the local client connected to it. The client then executes the local version of the Lambda function and sends back the results to the WebSocket API. Which then responds to the stub Lambda. And finally the stub Lambda responds back with the results.

The DynamoDB table keeps track of the connections. While the S3 bucket is used as temporary storage for passing large requests/responses between the client and the debug stack.

## An example

Let's look at an example.

<img alt="sst start demo architecture" src={useBaseUrl("img/sst-start-demo-architecture.png")} />

In this sample app we have:

- An API Gateway endpoint
- An SNS topic
- A Lambda function (`api.js`) that responds to the API and sends a message to the SNS topic
- A Lambda function (`sns.js`) that subscribes to the SNS topic

So when a request is made to the API endpoint, the stub version of `api.js` gets invoked and sends a message to the debug stack. This in turn gets streamed to the client. The client invokes the local version of `api.js` and returns the results to the debug stack. The local version also sends a message to the SNS topic. Meanwhile, the stub `api.js` responds to the API request with the results. Now the stub version of `sns.js` gets invoked as it is subscribed to the SNS topic. This gets sent to the debug stack which in turn gets streamed to the client to execute the local version of `sns.js`. The results of this are streamed back to stub `sns.js` that responds with the results.

You can <a href={ `${config.github}/tree/master/examples/rest-api` }>try out this sample repo here</a> and [read about the **sst start** command here](packages/cli.md#start).

## Advantages

This approach has a couple of advantages.

- You can work on your Lambda functions locally and [set breakpoints in VS Code](debugging-with-vscode.md)
- While interacting with your entire deployed AWS infrastructure
- It supports all Lambda triggers, so there's no need to mock API Gateway, SQS, SNS, etc.
- It supports real Lambda environment variables
- And Lambda IAM permissions, so if a Lambda fails on AWS due to the lack of IAM permissions, it would fail locally as well.
- And it's fast! There's nothing to deploy when you make a change!

A couple of things to note.

- The debug stack is completely serverless
  - So you don't get charged when it's not in use
  - And it's very cheap per request, it'll be within the free tier limits
- All the data stays between your local machine and your AWS account
  - There are no 3rd party services that are used
  - Support for connecting to AWS resources inside a VPC

## CDK builds

The above steps apply to the Lambda functions in your app. For the CDK code in your app, SST will automatically watch for changes and rebuild it but it won't deploy them.

Instead, it'll first compare the generated CloudFormation template to the previously built one. If there are new infrastructure changes, it'll prompt you to _press ENTER_ to deploy them. And once you do, it'll deploy your new infrastructure.

<div class={styles.videoWrapper}>
  <iframe width="560" height="315" src="https://www.youtube.com/embed/44SXlXGUpC0" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
</div>

## Using within a team

The debug stack is deployed with a stack name that looks like `$stageName-$appName-debug-stack`. This means that:

- If two people run `sst start` (with the default options) on the same app; they'll both deploy the same app with the same debug stack.
- The person that connected first will get disconnected when the second person connects. They'll receive a message saying that another client has connected.

This is intentional. SST is designed to give each developer their own isolated development environment.

#### Separate environments

So the recommended workflow when using within a team is to set the `--stage` option per developer.

So Tom might do something like:

```bash
sst start --stage dev-tom
```

While Sally might:

```bash
sst start --stage dev-sally
```

Here the `--stage` option is simply a string that deploys the given app with its own set of resources. You can read more about the [CLI options here](packages/cli.md).

You can also do something like this in your `package.json` scripts. [Thanks to a user on Twitter](https://twitter.com/aarvay/status/1381553741233459206) for pointing this out.

```json
"scripts": {
  "start": "sst start --stage $(whoami)"
}
```

#### Separate AWS accounts

You can take this a step further and create separate AWS accounts for every developer on the team. This approach is more cumbersome but guarantees complete isolation. AWS allows you to [manage these accounts centrally through AWS Organizations](https://serverless-stack.com/chapters/manage-aws-accounts-using-aws-organizations.html).

The other benefit of this approach is that as a developer, you won't need to set the stage in the `sst start` command.

## Connecting to a VPC

If you have resources like RDS instances deployed inside a VPC, by default your local Lambda function cannot connect to them. You need to:

1. Setup a VPN connection from your local machine to your VPC network. You can use the AWS Client VPN service to set it up. Follow the [Mutual authentication section in this article](https://docs.aws.amazon.com/vpn/latest/clientvpn-admin/client-authentication.html#mutual) to setup the certificates and import them into your Amazon Certificate Manager.
2. Then [create a Client VPC Endpoint](https://aws.amazon.com/blogs/networking-and-content-delivery/introducing-aws-client-vpn-to-securely-access-aws-and-on-premises-resources/), and associate it with your VPC.
3. And, finally install [Tunnelblick](https://tunnelblick.net) locally to establish the VPN connection.

Note that, the AWS Client VPC service is billed on an hourly basis but it's fairly inexpensive. More details on the pricing here - https://aws.amazon.com/vpn/pricing/

## Tagging the debug stack

You can [add tags](https://docs.aws.amazon.com/general/latest/gr/aws_tagging.html) to the debug stack by using the `debugStack` callback method in your `lib/index.js`.

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<Tabs
  defaultValue="js"
  values={[
    { label: "JavaScript", value: "js", },
    { label: "TypeScript", value: "ts", },
  ]
}>
<TabItem value="js">

```js title="lib/index.js" {7-9}
import * as cdk from "@aws-cdk/core";

export default function main(app) {
  // define your stacks here
}

export function debugStack(app, stack, props) {
  cdk.Tags.of(app).add("my-stage", props.stage);
}
```

</TabItem>
<TabItem value="ts">

```ts title="lib/index.ts" {8-14}
import * as cdk from "@aws-cdk/core";
import * as sst from "@serverless-stack/resources";

export default function main(app: sst.App): void {
  // define your stacks here
}

export function debugStack(
  app: cdk.App,
  stack: cdk.Stack,
  props: sst.DebugStackProps
): void {
  cdk.Tags.of(app).add("my-stage", props.stage);
}
```

</TabItem>
</Tabs>


The debug stack is deployed as a CDK app as well. So the `debugStack` method is called with its [`cdk.App`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_core.App.html) and [`cdk.Stack`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_core.Stack.html) instances.

Also passed in is a `props` object of type [`DebugStackProps`](#debugstackprops).

#### DebugStackProps

The `DebugStackProps` contains the following attributes.

**stage**

_Type_ : `string`

The name of the stage that the app (and debug stack) is being deployed to.


