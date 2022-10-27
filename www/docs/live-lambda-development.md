---
title: Live Lambda Development
sidebar_label: Live Lambda
description: Live Lambda Development allows you to debug and test your Lambda functions locally, while being invoked remotely by resources in AWS.
---

import config from "../config";
import styles from "./video.module.css";
import useBaseUrl from "@docusaurus/useBaseUrl";
import HeadlineText from "@site/src/components/HeadlineText";

<HeadlineText>

SST features a cloud native local development environment that gives you instantaneous feedback on changes made to your Lambda functions.

</HeadlineText>

<div class={styles.videoWrapper}>
  <iframe width="560" height="315" src="https://www.youtube-nocookie.com/embed/hnTSTm5n11g" frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
</div>

---

## Overview

Live Lambda Development is feature of SST that allows you to **debug and test your Lambda functions locally**, while being **invoked remotely by resources in AWS**. It works by proxying requests from your AWS account to your local machine.

Changes are automatically detected, built, and **live reloaded** in under 10 milliseconds. You can also use **breakpoints to debug** your functions in your favorite IDE.

---

## Quick start

To give it a try, create a new SST app with our Minimal JavaScript starter by running `npx create-sst@latest` > `minimal` > `minimal/javascript-starter`. Once the app is created, install the dependencies.

To start the Live Lambda Development environment run:

```bash
npx sst start
```

The first time you run this, it'll deploy your app and a stack that supports the debugger called the _Debug Stack_. This can take a couple of minutes.

<details>
<summary>Behind the scenes</summary>

When this command is first run for a project, you will be prompted for a default stage name.

```txt
Look like you’re running sst for the first time in this directory.
Please enter a stage name you’d like to use locally.
Or hit enter to use the one based on your AWS credentials (spongebob):
```

It'll suggest that you use a stage name based on your AWS username. This value is stored in a `.sst` directory in the project root and should not be checked into source control.

A stage ensures that you are working in an environment that is separate from the other people on your team. Or from your production environment. It's meant to be unique.

</details>

The starter deploys a Lambda function with an API endpoint. You'll see something like this in your terminal.

```bash
Outputs:
  ApiEndpoint: https://s8gecmmzxf.execute-api.us-east-1.amazonaws.com
```

If you head over to the endpoint, it'll invoke the Lambda function in `services/functions/lambda.js`.

You can try changing this file and hitting the endpoint again. You should **see your changes reflected right away**!

---

## Background

Let's look at how Live Lambda Dev works behind the scenes. But first let's start with a little bit of background.

Working on Lambda functions locally can be painful. You have to either:

1. Locally mock all the services that your Lambda function uses

   Like API Gateway, SNS, SQS, etc. This is hard to do. If you are using a tool that mocks a specific service (like API Gateway), you won't be able to test a Lambda that's invoked by a different service (like SNS). On the other hand a service like [LocalStack](https://localstack.cloud), that tries to mock a whole suite of services, is slow and the mocked services can be out of date.

2. Or, you'll need to deploy your changes to test them

   Each deployment can take at least a minute. And repeatedly deploying to test a change really slows down the feedback loop.

---

## How it works

To fix this, we created Live Lambda Dev. A local development environment for Lambda.

This command does a couple of things:

1. It deploys a _Debug Stack_ with a WebSocket API to the same AWS account and region as your app.
2. It deploys your app and replaces the Lambda functions with a _stub_ Lambda.
3. Starts up a local WebSocket client to connect to the WebSocket API in the debug stack.

<details>
<summary>Behind the scenes</summary>

Aside from the WebSocket API, the debug stack contains a DynamoDB table, and an S3 bucket.

The DynamoDB table keeps track of the connections. While the S3 bucket is used as temporary storage for passing large requests/responses between the client and the debug stack.

#### An example

To understand the flow better, let's look at a non-trivial example.

![sst start demo architecture](/img/sst-start-demo-architecture.png)

In this sample app we have:

- An API Gateway endpoint
- An SNS topic
- A Lambda function (`api.js`) that responds to the API and sends a message to the SNS topic
- A Lambda function (`sns.js`) that subscribes to the SNS topic

So when a request is made to the API endpoint:

1. The stub version of `api.js` gets invoked and sends a message to the debug stack.
2. This in turn gets streamed to the client.
3. The client invokes the local version of `api.js` and:
   - Returns the results to the debug stack.
   - It also sends a message to the SNS topic.
4. The stub `api.js` responds to the API request with the results.
5. Now the stub version of `sns.js` gets invoked as it is subscribed to the SNS topic.
6. This gets sent to the debug stack which in turn gets streamed to the client to execute the local version of `sns.js`.
7. The results of this is streamed back to stub `sns.js` that responds with the results.

So from the outside it looks like the entire flow was executed in AWS. But all the Lambda functions were processed on your local machine.

</details>

The stub Lambda when invoked, sends a message to the WebSocket API, which in turn sends a message to the local client connected to it. The client then executes the local version of the Lambda function and sends back the results to the WebSocket API. Which then responds to the stub Lambda. And finally the stub Lambda responds back with the results.

---

### Cost

The debug stack that powers the Live Lambda Dev environment is **completely serverless**. So you don't get charged when it's not in use. And it's very cheap per request, it'll be within the free tier limits.

As a result this approach works great even when [there are multiple developers on your team](working-with-your-team.md).

---

### Privacy

All the data stays between your local machine and your AWS account. There are **no 3rd party services** that are used.

Live Lambda Dev also supports connecting to AWS resources inside a VPC. We'll [look at this below](#working-with-a-vpc).

---

### Languages

Live Lambda Dev and setting breakpoints are supported in the following languages.

| Language   | Live Lambda | Breakpoints |
| ---------- | ----------- | ----------- |
| JavaScript | ✅          | ✅          |
| TypeScript | ✅          | ✅          |
| Python     | ✅          | 💪          |
| Golang     | ✅          | ❌          |
| Java       | ✅          | ❌          |
| C#         | ✅          | ❌          |
| F#         | ✅          | ❌          |

✅ Officially supported 💪 [Community support](https://www.linen.dev/s/serverless-stack/t/445893/Hey-U01J5Q8HV5Z-U01JVDKASAC-I-ve-successfully-followed-the-G) ❌ Not supported

---

## Advantages

The Live Lambda Dev approach has a couple of advantages.

1. You can work on your Lambda functions locally and set breakpoints in VS Code.
2. Interact with the entire infrastructure of your app as it has been deployed to AWS.
3. Supports all **Lambda triggers**, so there's no need to mock API Gateway, SQS, SNS, etc.
4. Supports real Lambda **environment variables**.
5. Supports Lambda **IAM permissions**, so if a Lambda fails on AWS due to the lack of IAM permissions, it would fail locally as well.
6. And it's fast! It's **50-100x faster** than alternatives like [SAM Accelerate](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/accelerate.html) or [CDK Watch](https://aws.amazon.com/blogs/developer/increasing-development-speed-with-cdk-watch/).

---

## How Live Lambda is different

The other serverless frameworks have tried to address the problem of local development with Lambda functions. Let's look at how Live Lambda Dev is different.

---

### Serverless Offline

[Serverless Framework](https://www.serverless.com/framework) has a plugin called [Serverless Offline](https://www.serverless.com/plugins/serverless-offline) that developers use to work on their applications locally.

It **emulates Lambda** and API Gateway locally. Unfortunately, this doesn't work if your functions are triggered by other AWS services. So you'll need to create mock Lambda events.

---

### SAM Accelerate

[AWS SAM](https://aws.amazon.com/serverless/sam/) features [SAM Accelerate](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/accelerate.html) to help with local development. It directly updates your Lambda functions without doing a full deployment of your app.

However, this is still **too slow** because it needs to bundle and upload your Lambda function code to AWS. It can take a few seconds. Live Lambda Dev in comparison is 50-100x faster.

---

### CDK Watch

[AWS CDK](https://aws.amazon.com/cdk/) has something called [CDK Watch](https://aws.amazon.com/blogs/developer/increasing-development-speed-with-cdk-watch/) to speed up local development. It watches for file changes and updates your Lambda functions without having to do a full deployment.

However, this is **too slow** because it needs to bundle and upload your Lambda function code. It can take a few seconds. Live Lambda Dev in comparison is 50-100x faster.

---

## Debugging With VS Code

The Live Lambda Development environment runs a Node.js process locally. This allows you to use [Visual Studio Code](https://code.visualstudio.com) to debug your serverless apps live.

Let's look at how to set this up.

<div class={styles.videoWrapper}>
  <iframe width="560" height="315" src="https://www.youtube-nocookie.com/embed/2w4A06IsBlU" frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
</div>

---

#### Launch configurations

Add the following to `.vscode/launch.json`.

```json title="launch.json"
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Debug SST Start",
      "type": "node",
      "request": "launch",
      "runtimeExecutable": "${workspaceRoot}/node_modules/.bin/sst",
      "runtimeArgs": ["start", "--increase-timeout"],
      "console": "integratedTerminal",
      "skipFiles": ["<node_internals>/**"]
    }
  ]
}
```

This contains the launch configuration to run the `sst start` command in debug mode. Allowing you to set breakpoints to your Lambda functions. We also have <a href={ `${config.github}/tree/master/examples/vscode` }>an example project</a> with a VS Code setup that you can use as a reference.

:::tip
If you are using one of our starters, you should already have a `.vscode` directory in your project root.
:::

It also uses the `integratedTerminal` mode to allow you to [_press ENTER_](#watching-infrastructure-changes) when you need to update your infrastructure.

---

#### Debug Lambda functions

Next, head over to the **Run And Debug** tab and for the debug configuration select **Debug SST Start**.

<img alt="VS Code debug SST start" src={useBaseUrl("img/screens/vs-code-debug-sst-start.png")} />

Now you can set a breakpoint and start your app by pressing `F5` or by clicking **Run** > **Start Debugging**. Then triggering your Lambda function will cause VS Code to stop at your breakpoint.

---

#### Increasing timeouts

By default the timeout for a Lambda function might not be long enough for you to view the breakpoint info. So we need to increase this. We use the [`--increase-timeout`](packages/cli.md#options) option for the `sst start` command in our `launch.json`.

```js title="launch.json
"runtimeArgs": ["start", "--increase-timeout"],
```

This increases our Lambda function timeouts to their maximum value of 15 minutes. For APIs the timeout cannot be increased more than 30 seconds. But you can continue debugging the Lambda function, even after the API request times out.

---

## Debugging with WebStorm

You can also set breakpoints and debug your Lambda functions locally with [WebStorm](http://www.jetbrains.com/webstorm/). [Check out this tutorial for more details](https://sst.dev/examples/how-to-debug-lambda-functions-with-webstorm.html).

<div class={styles.videoWrapper}>
  <iframe width="560" height="315" src="https://www.youtube-nocookie.com/embed/_cLM_0On_Cc" frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
</div>

---

## Debugging with IntelliJ IDEA

If you are using [IntelliJ IDEA](https://www.jetbrains.com/idea/), [follow this tutorial to set breakpoints in your Lambda functions](https://sst.dev/examples/how-to-debug-lambda-functions-with-intellij-idea.html).

<div class={styles.videoWrapper}>
  <iframe width="560" height="315" src="https://www.youtube-nocookie.com/embed/iABx-4bjWJ0" frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
</div>

---

## Built-in environment variables

SST sets the `IS_LOCAL` environment variable to `true` by default when running inside `sst start`.

The `process.env.IS_LOCAL` is set in both the stack and function code.

So in your stack code you can do something like.

```js title="stacks/MyStack.js" {3}
function Stack(ctx) {
  // Increase the timeout locally
  const timeout = process.env.IS_LOCAL ? 900 : 15;

  // Rest of the resources
}
```

And in your Lambda functions.

```js title="src/lambda.js" {2}
export async function main(event) {
  const body = process.env.IS_LOCAL ? "Hello, Local!" : "Hello, World!";

  return {
    body,
    statusCode: 200,
    headers: { "Content-Type": "text/plain" },
  };
}
```

---

## Working with a VPC

If you have resources like RDS instances deployed inside a VPC, and you are not using the Data API to talk to the database, you have the following options.

---

#### Connect to a VPC

By default your local Lambda function cannot connect to the database in a VPC. You need to:

1. Setup a VPN connection from your local machine to your VPC network. You can use the AWS Client VPN service to set it up. [Follow the Mutual authentication section in this doc](https://docs.aws.amazon.com/vpn/latest/clientvpn-admin/client-authentication.html#mutual) to setup the certificates and import them into your Amazon Certificate Manager.
2. Then [create a Client VPC Endpoint](https://aws.amazon.com/blogs/networking-and-content-delivery/introducing-aws-client-vpn-to-securely-access-aws-and-on-premises-resources/), and associate it with your VPC.
3. And, finally install [Tunnelblick](https://tunnelblick.net) locally to establish the VPN connection.

Note that, the AWS Client VPC service is billed on an hourly basis but it's fairly inexpensive. [Read more on the pricing here](https://aws.amazon.com/vpn/pricing/).

---

#### Connect to a local DB

Alternatively, you can run the database server locally (ie. MySQL or PostgreSQL). And in your function code, you can connect to a local server if [`IS_LOCAL`](environment-variables.md#is_local) is set:

```js
const dbHost = process.env.IS_LOCAL
  ? "localhost"
  : "amazon-string.rds.amazonaws.com";
```

---

## Customizing the Debug Stack

You can customize the [Debug Stack](constructs/DebugStack.md) by using the `debugApp` callback method in your `stacks/index.js`. You can use this to do things like [adding tags](advanced/tagging-resources.md#tagging-the-debug-stack) and [setting permission boundaries](advanced/permission-boundary.md#setting-the-permission-boundary-for-the-debug-stack), etc.

```js title="stacks/index.js" {8-12}
import * as cdk from "aws-cdk-lib";
import * as sst from "@serverless-stack/resources";

export default function main(app) {
  // Define your stacks here
}

export function debugApp(app) {
  // Make sure to create the DebugStack when using the debugApp callback
  new sst.DebugStack(app, "debug-stack");
  cdk.Tags.of(app).add("my-tag", `${app.stage}-${app.region}`);
}
```

:::note
If you are using the `debugApp` callback, you'll need to make sure to create the `DebugStack` in it.
:::

The `DebugStack` is deployed as a CDK app, called [`DebugApp`](constructs/DebugApp.md). The `app` argument above in the `debugApp` callback is an instance of the `DebugApp` construct.

## Watching infrastructure changes

So far we've looked at making changes to the Lambda functions in your app. For the infrastructure code in your app, SST will automatically watch for changes and rebuild it but it won't deploy them.

Instead, it'll first compare the generated CloudFormation template to the previously built one. If there are new infrastructure changes, it'll prompt you to _press ENTER_ to deploy them. And once you do, it'll deploy your new infrastructure.

<div class={styles.videoWrapper}>
  <iframe width="560" height="315" src="https://www.youtube-nocookie.com/embed/44SXlXGUpC0" frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
</div>

The [SST Console](console.md) will also show you if there are any infrastructure changes that need to be deployed.
