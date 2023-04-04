---
title: Live Lambda Development
sidebar_label: Live Lambda
description: Live Lambda Development allows you to debug and test your Lambda functions locally.
---

import config from "../config";
import styles from "./video.module.css";
import useBaseUrl from "@docusaurus/useBaseUrl";
import HeadlineText from "@site/src/components/HeadlineText";

<HeadlineText>

SST features a local development environment that lets you debug and test your Lambda functions locally.

</HeadlineText>

<div class={styles.videoWrapper}>
  <iframe width="560" height="315" src="https://www.youtube-nocookie.com/embed/hnTSTm5n11g" frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
</div>

---

## Overview

Live Lambda Development or Live Lambda is feature of SST that allows you to **debug and test your Lambda functions locally**, while being **invoked remotely by resources in AWS**. It works by proxying requests from your AWS account to your local machine.

Changes are automatically detected, built, and **live reloaded** in under 10 milliseconds. You can also use **breakpoints to debug** your functions live with your favorite IDE.

---

## Quick start

To give it a try, create a new SST app by running `npx create-sst@latest`. Once the app is created, install the dependencies.

To start the Live Lambda Development environment run:

```bash
npx sst dev
```

The first time you run this, it'll deploy your app to AWS. This can take a couple of minutes.

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

If you head over to the endpoint, it'll invoke the Lambda function in `packages/functions/src/lambda.js`. You can try changing this file and hitting the endpoint again. You should **see your changes reflected right away**!

Before we look at how Live Lambda works behind the scenes, let's start with a little bit of background.

---

## Background

Working on Lambda functions locally can be painful. You have to either:

1. Locally mock all the services that your Lambda function uses

   Like API Gateway, SNS, SQS, etc. This is hard to do. If you are using a tool that mocks a specific service (like API Gateway), you won't be able to test a Lambda that's invoked by a different service (like SNS). On the other hand a service like [LocalStack](https://localstack.cloud), that tries to mock a whole suite of services, is slow and the mocked services can be out of date.

2. Or, you'll need to deploy your changes to test them

   Each deployment can take at least a minute. And repeatedly deploying to test a change really slows down the feedback loop.

---

## How it works

To fix this, we created Live Lambda — a local development environment for Lambda functions. It works by proxying requests from Lambda functions to your local machine. This allows SST to run the local version of a function with the event, context, and credentials of the remote Lambda function.

SST uses [AWS IoT over WebSocket](https://docs.aws.amazon.com/iot/latest/developerguide/protocols.html) to communicate between your local machine and the remote Lambda function. Every AWS account comes with a AWS IoT Core endpoint by default. You can publish events and subscribe to them.

:::info Live Lambda v1

Prior to SST v2, Live Lambda was implemented using a WebSocket API and a DynamoDB table. These were deployed to your account as a separate stack in your app.

This new IoT approach is a lot faster, roughly 2-3x. And it does not require any additional infrastructure.

:::

Here's how it works.

1. When you run `sst dev`, it deploys your app and replaces the Lambda functions with a _stub_ version.
2. It also starts up a local WebSocket client and connects to your AWS accounts' IoT endpoint.
3. Now, when a Lambda function in your app is invoked, it publishes an event, where the payload is the Lambda function request.
4. Your local WebSocket client receives this event. It publishes an event acknowledging that it received the request.
5. Next, it runs the local version of the function and publishes an event with the function response as the payload. The local version is run as a Node.js Worker.
6. Finally, the stub Lambda function receives the event and responds with the payload.

<details>
<summary>Behind the scenes</summary>

The AWS IoT events are published using the format `/sst/<app>/<stage>/<event>`. Where `app` is the name of the app and `stage` is the stage `sst dev` is deployed to.

Each Lambda function invocation is made up of three events; the original request fired by the remote Lambda function, the local CLI acknowledging the request, and the response fired by the local CLI.

If the payload of the events are larger than 100kb, they get chunked into separate events.

</details>

So while the local Lambda function is executed, from the outside it looks like it was run in AWS. This approach has [several advantages](#advantages) that we'll look at below.

---

### Cost

AWS IoT that powers Live Lambda is **completely serverless**. So you don't get charged when it's not in use.

It's also pretty cheap. With a free tier of 500k events per month and roughly $1.00 per million for the next billion messages. You can [check out the details here](https://aws.amazon.com/iot-core/pricing/).

As a result this approach works great even when [there are multiple developers on your team](working-with-your-team.md).

---

### Privacy

All the data stays between your local machine and your AWS account. There are **no 3rd party services** that are used.

Live Lambda also supports connecting to AWS resources inside a VPC. We'll [look at this below](#working-with-a-vpc).

---

### Languages

Live Lambda and setting breakpoints are supported in the following languages.

| Language   | Live Lambda                      | Set breakpoints                  |
| ---------- | -------------------------------- | -------------------------------- |
| JavaScript | <i className="fas fa-check"></i> | <i className="fas fa-check"></i> |
| TypeScript | <i className="fas fa-check"></i> | <i className="fas fa-check"></i> |
| Python     | <i className="fas fa-check"></i> | <i className="fas fa-users"></i> |
| Golang     | <i className="fas fa-check"></i> | <i className="fas fa-times"></i> |
| Java       | <i className="fas fa-check"></i> | <i className="fas fa-times"></i> |
| C#         | <i className="fas fa-check"></i> | <i className="fas fa-times"></i> |
| F#         | <i className="fas fa-check"></i> | <i className="fas fa-times"></i> |

<i className="fas fa-check"></i> Officially supported&nbsp;&nbsp;
<i className="fas fa-users"></i> <a href="https://www.linen.dev/s/serverless-stack/t/445893/Hey-U01J5Q8HV5Z-U01JVDKASAC-I-ve-successfully-followed-the-G">Community support</a>&nbsp;&nbsp;
<i className="fas fa-times"></i> Not supported&nbsp;&nbsp;

---

## Advantages

The Live Lambda approach has a couple of advantages.

1. You can work on your Lambda functions locally and set breakpoints in VS Code.
2. Interact with the entire infrastructure of your app as it has been deployed to AWS. This is really useful for **testing webhooks** because you have an endpoint that is not on localhost.
3. Supports all **Lambda triggers**, so there's no need to mock API Gateway, SQS, SNS, etc.
4. Supports real Lambda **environment variables**.
5. Supports Lambda **IAM permissions**, so if a Lambda fails on AWS due to the lack of IAM permissions, it would fail locally as well.
6. And it's fast! It's **50-100x faster** than alternatives like [SAM Accelerate](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/accelerate.html) or [CDK Watch](https://aws.amazon.com/blogs/developer/increasing-development-speed-with-cdk-watch/).

---

## How Live Lambda is different

The other serverless frameworks have tried to address the problem of local development with Lambda functions. Let's look at how Live Lambda is different.

---

### Serverless Offline

[Serverless Framework](https://www.serverless.com/framework) has a plugin called [Serverless Offline](https://www.serverless.com/plugins/serverless-offline) that developers use to work on their applications locally.

It **emulates Lambda** and API Gateway locally. Unfortunately, this doesn't work if your functions are triggered by other AWS services. So you'll need to create mock Lambda events.

---

### SAM Accelerate

[AWS SAM](https://aws.amazon.com/serverless/sam/) features [SAM Accelerate](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/accelerate.html) to help with local development. It directly updates your Lambda functions without doing a full deployment of your app.

However, this is still **too slow** because it needs to bundle and upload your Lambda function code to AWS. It can take a few seconds. Live Lambda in comparison is 50-100x faster.

---

### CDK Watch

[AWS CDK](https://aws.amazon.com/cdk/) has something called [CDK Watch](https://aws.amazon.com/blogs/developer/increasing-development-speed-with-cdk-watch/) to speed up local development. It watches for file changes and updates your Lambda functions without having to do a full deployment.

However, this is **too slow** because it needs to bundle and upload your Lambda function code. It can take a few seconds. Live Lambda in comparison is 50-100x faster.

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
      "name": "Debug SST Dev",
      "type": "node",
      "request": "launch",
      "runtimeExecutable": "${workspaceRoot}/node_modules/.bin/sst",
      "runtimeArgs": ["dev", "--increase-timeout"],
      "console": "integratedTerminal",
      "skipFiles": ["<node_internals>/**"]
    }
  ]
}
```

This contains the launch configuration to run the `sst dev` command in debug mode. Allowing you to set breakpoints to your Lambda functions. We also have <a href={ `${config.github}/tree/master/examples/vscode` }>an example project</a> with a VS Code setup that you can use as a reference.

:::tip
If you are using one of our starters, you should already have a `.vscode` directory in your project root.
:::

---

#### Debug Lambda functions

Next, head over to the **Run And Debug** tab and for the debug configuration select **Debug SST Dev**.

<img alt="VS Code debug SST Dev" src={useBaseUrl("img/screens/vs-code-debug-sst-start.png")} />

Now you can set a breakpoint and start your app by pressing `F5` or by clicking **Run** > **Start Debugging**. Then triggering your Lambda function will cause VS Code to stop at your breakpoint.

---

#### Increasing timeouts

By default the timeout for a Lambda function might not be long enough for you to view the breakpoint info. So we need to increase this. We use the [`--increase-timeout`](packages/sst.md#sst-dev) option for the `sst dev` command in our `launch.json`.

```js title="launch.json
"runtimeArgs": ["dev", "--increase-timeout"],
```

This increases our Lambda function timeouts to their maximum value of 15 minutes. For APIs the timeout cannot be increased more than 30 seconds. But you can continue debugging the Lambda function, even after the API request times out.

---

## Debugging with WebStorm

You can also set breakpoints and debug your Lambda functions locally with [WebStorm](http://www.jetbrains.com/webstorm/). [Check out this tutorial for more details](https://sst.dev/examples/how-to-debug-lambda-functions-with-webstorm.html).

<div class={styles.videoWrapper}>
  <iframe width="560" height="315" src="https://www.youtube-nocookie.com/embed/_cLM_0On_Cc" frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
</div>

:::note
In some versions of WebStorm you might need to disable stepping through library scripts. You can do this by heading to **Preferences** > **Build, Execution, Deployment** > **Debugger** > **Stepping** > unchecking **Do not step into library scripts**.
:::

---

## Debugging with IntelliJ IDEA

If you are using [IntelliJ IDEA](https://www.jetbrains.com/idea/), [follow this tutorial to set breakpoints in your Lambda functions](https://sst.dev/examples/how-to-debug-lambda-functions-with-intellij-idea.html).

<div class={styles.videoWrapper}>
  <iframe width="560" height="315" src="https://www.youtube-nocookie.com/embed/iABx-4bjWJ0" frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
</div>

---

## Built-in environment variables

SST sets the `IS_LOCAL` environment variable to `true` for functions running inside `sst dev`.

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

Alternatively, you can run the database server locally (ie. MySQL or PostgreSQL). And in your function code, you can connect to a local server if [`IS_LOCAL`](#built-in-environment-variables) is set:

```js
const dbHost = process.env.IS_LOCAL
  ? "localhost"
  : "amazon-string.rds.amazonaws.com";
```

## Infrastructure changes

In addition to the changes made to your Lambda functions, `sst dev` also watches for infrastructure changes and will automatically redeploy them.
