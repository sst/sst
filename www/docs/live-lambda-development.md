---
title: Live Lambda Development
description: Live Lambda Development allows you to debug and test your Lambda functions locally, while being invoked remotely by resources in AWS. It works by proxying requests from your AWS account to your local machine.
---

import config from "../config";
import styles from "./video.module.css";
import useBaseUrl from "@docusaurus/useBaseUrl";

SST provides a cloud native local development environment that gives you instantaneous feedback on edits made in your Lambda function code. Changes are automatically detected, built, and live reloaded in **under 10 milliseconds**. And you can use **breakpoints to debug** your functions in your favorite IDE.

Live Lambda Development is an SST feature that allows you to **debug and test your Lambda functions locally**, while being **invoked remotely by resources in AWS**. It works by proxying requests from your AWS account to your local machine.

<div class={styles.videoWrapper}>
  <iframe width="560" height="315" src="https://www.youtube.com/embed/hnTSTm5n11g" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
</div>

### Starting the local environment

Let's start the local development environment.

```bash
# With npm
npx sst start
# Or with Yarn
yarn sst start
```

When this command is first run for a project, you will be prompted for a default stage name.

```txt
Look like you’re running sst for the first time in this directory.
Please enter a stage name you’d like to use locally.
Or hit enter to use the one based on your AWS credentials (spongebob):
```

It'll suggest that you use a stage name based on your AWS username. This value is stored in a `.sst` directory in the root and should not be checked into source control.

:::info
A stage ensures that you are working in an environment that is separate from the other people on your team. Or from your production environment. It's meant to be unique.
:::

The first time you run this, it'll deploy your app and a stack that sets up the debugger. This can take a couple of minutes.

### Making changes

The sample stack will deploy a Lambda function with an API endpoint. You'll see something like this in the output.

```bash
Outputs:
  ApiEndpoint: https://s8gecmmzxf.execute-api.us-east-1.amazonaws.com
```

If you head over to the endpoint, it'll invoke the Lambda function in `src/lambda.js`. You can try changing this file and hitting the endpoint again. You should **see your changes reflected right away**!

## How it works

Let's look at how Live Lambda Dev works behind the scenes. But first let's start with a little bit of background.

### Background

Working on Lambda functions locally can be painful. You have to either:

1. Locally mock all the services that your Lambda function uses

   Like API Gateway, SNS, SQS, etc. This is hard to do. If you are using a tool that mocks a specific service (like API Gateway), you won't be able to test a Lambda that's invoked by a different service (like SNS). On the other hand a service like [LocalStack](https://localstack.cloud), that tries to mock a whole suite of services, is slow and the mocked services can be out of date.

2. Or, you'll need to deploy your changes to test them

   Each deployment can take at least a minute. And repeatedly deploying to test a change really slows down the feedback loop.

### `sst start`

To fix this, we created `sst start`. A local development environment for Lambda. This command does a couple of things:

1. It deploys a _debug stack_ with a WebSocket API to the same AWS account and region as your app.
2. It deploys your app and replaces the Lambda functions with a _stub_ Lambda.
3. Starts up a local WebSocket client to connect to the debug stack.

The debug stack contains a serverless WebSocket API, a DynamoDB table, and a S3 bucket. The stub Lambda when invoked, sends a message to the WebSocket API, which in turn sends a message to the local client connected to it. The client then executes the local version of the Lambda function and sends back the results to the WebSocket API. Which then responds to the stub Lambda. And finally the stub Lambda responds back with the results.

The DynamoDB table keeps track of the connections. While the S3 bucket is used as temporary storage for passing large requests/responses between the client and the debug stack.

### An example

Let's look at an example.

![sst start demo architecture](/img/sst-start-demo-architecture.png)

In this sample app we have:

- An API Gateway endpoint
- An SNS topic
- A Lambda function (`api.js`) that responds to the API and sends a message to the SNS topic
- A Lambda function (`sns.js`) that subscribes to the SNS topic

So when a request is made to the API endpoint, the stub version of `api.js` gets invoked and sends a message to the debug stack. This in turn gets streamed to the client. The client invokes the local version of `api.js` and returns the results to the debug stack. The local version also sends a message to the SNS topic. Meanwhile, the stub `api.js` responds to the API request with the results. Now the stub version of `sns.js` gets invoked as it is subscribed to the SNS topic. This gets sent to the debug stack which in turn gets streamed to the client to execute the local version of `sns.js`. The results of this are streamed back to stub `sns.js` that responds with the results.

You can <a href={ `${config.github}/tree/master/examples/rest-api` }>try out this sample repo here</a> and [read about the **sst start** command here](packages/cli.md#start).

### Advantages

This approach has a couple of advantages.

1. You can work on your Lambda functions locally and [set breakpoints in VS Code](#debugging-with-visual-studio-code).
2. Interact with your entire deployed AWS infrastructure.
3. Supports all Lambda triggers, so there's no need to mock API Gateway, SQS, SNS, etc.
4. Supports real Lambda environment variables.
5. And Lambda IAM permissions, so if a Lambda fails on AWS due to the lack of IAM permissions, it would fail locally as well.
6. And it's fast! Nothing is deployed when you make a change!

A couple of things to note.

- The debug stack is completely serverless.
  - So you don't get charged when it's not in use.
  - And it's very cheap per request, it'll be within the free tier limits.
- All the data stays between your local machine and your AWS account.
  - There are no 3rd party services that are used.
  - Supports connecting to AWS resources inside a VPC.

This approach also works well when [working with multiple developers on your team](working-with-your-team.md).

#### Deprecating the `stage` option in the `sst.json`

Note that, starting from [v0.41.0](https://github.com/serverless-stack/serverless-stack/releases/tag/v0.41.0), SST will show a warning if the `stage` is specified in the `sst.json`. This option will soon be deprecated.

If you are working locally, you can remove this option and on the next `sst start` you'll be prompted to enter the stage name. Use the same stage name as you were using before and SST will store that in the `.sst` directory as mentioned above.

If you are running this in a CI, set the [`--stage`](packages/cli.md#--stage) option explicitly.

## Debugging With Visual Studio Code

The Live Lambda Development environment runs a Node.js process locally. This allows you to use [Visual Studio Code](https://code.visualstudio.com) to debug your serverless apps live.

<div class={styles.videoWrapper}>
  <iframe width="560" height="315" src="https://www.youtube.com/embed/2w4A06IsBlU" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
</div>

You can also configure VS Code to debug your tests.

Let's look at how to set this up.

#### Launch configurations

To set these up, add the following to `.vscode/launch.json`.

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
    },
    {
      "name": "Debug SST Tests",
      "type": "node",
      "request": "launch",
      "runtimeExecutable": "${workspaceRoot}/node_modules/.bin/sst",
      "args": ["test", "--runInBand", "--no-cache", "--watchAll=false"],
      "cwd": "${workspaceRoot}",
      "protocol": "inspector",
      "console": "integratedTerminal",
      "internalConsoleOptions": "neverOpen",
      "env": { "CI": "true" },
      "disableOptimisticBPs": true
    }
  ]
}
```

This contains two launch configurations:

- **Debug SST Start**
  
  Runs the `sst start` command in debug mode. Allowing you to set breakpoints to your Lambda functions. It also uses the `integratedTerminal` mode to allow you to [_press ENTER_](#watching-infrastructure-changes) when you need to update your CDK infrastructure.

- **Debug SST Tests**
  
  Runs the `sst test` command in debug mode. Allowing you to set breakpoints in your Jest tests.

#### Debug Lambda functions

Next, head over to the **Run And Debug** tab and for the debug configuration select **Debug SST Start**.

<img alt="VS Code debug SST start" src={useBaseUrl("img/screens/vs-code-debug-sst-start.png")} />

Now you can set a breakpoint and start your app by pressing `F5` or by clicking **Run** > **Start Debugging**. Then triggering your Lambda function will cause VS Code to stop at your breakpoint.

#### Increasing timeouts

By default the timeout for a Lambda function might not be long enough for you to view the breakpoint info. So we need to increase this. We use the [`--increase-timeout`](packages/cli.md#options) option for the `sst start` command in our `launch.json`.

``` js title="launch.json
"runtimeArgs": ["start", "--increase-timeout"],
```

This increases our Lambda function timeouts to their maximum value of 15 minutes. For APIs the timeout cannot be increased more than 30 seconds. But you can continue debugging the Lambda function, even after the API request times out.

#### Debug tests

Similarly, you can debug the tests in your project by selecting the **Debug SST Tests** option in the debug configuration dropdown.

<img alt="VS Code debug SST tests" src={useBaseUrl("img/screens/vs-code-debug-sst-tests.png")} />

This allows you to set breakpoints in your tests and debug them.

#### Example project

We have <a href={ `${config.github}/tree/master/examples/vscode` }>an example project</a> with a VS Code setup that you can use as a reference.

## Debugging with WebStorm

You can also set breakpoints and debug your Lambda functions locally with [WebStorm](http://www.jetbrains.com/webstorm/) and SST. [Check out this tutorial for more details](https://serverless-stack.com/examples/how-to-debug-lambda-functions-with-webstorm.html).

<div class={styles.videoWrapper}>
  <iframe width="560" height="315" src="https://www.youtube.com/embed/_cLM_0On_Cc" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
</div>

## Debugging with IntelliJ IDEA

If you are using [IntelliJ IDEA](https://www.jetbrains.com/idea/), [follow this tutorial to set breakpoints in your Lambda functions](https://serverless-stack.com/examples/how-to-debug-lambda-functions-with-intellij-idea.html).

<div class={styles.videoWrapper}>
  <iframe width="560" height="315" src="https://www.youtube.com/embed/iABx-4bjWJ0" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
</div>

## Watching infrastructure changes

The above steps apply to the Lambda functions in your app. For the CDK code in your app, SST will automatically watch for changes and rebuild it but it won't deploy them.

Instead, it'll first compare the generated CloudFormation template to the previously built one. If there are new infrastructure changes, it'll prompt you to _press ENTER_ to deploy them. And once you do, it'll deploy your new infrastructure.

<div class={styles.videoWrapper}>
  <iframe width="560" height="315" src="https://www.youtube.com/embed/44SXlXGUpC0" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
</div>

## Working with a VPC

If you have resources like RDS instances deployed inside a VPC, and you are not [using the Data API](database.md#aurora-rds) to talk to the database, you have the following options when working locally.

### Connecting to a VPC

By default your local Lambda function cannot connect to the database. You need to:

1. Setup a VPN connection from your local machine to your VPC network. You can use the AWS Client VPN service to set it up. [Follow the Mutual authentication section in this doc](https://docs.aws.amazon.com/vpn/latest/clientvpn-admin/client-authentication.html#mutual) to setup the certificates and import them into your Amazon Certificate Manager.
2. Then [create a Client VPC Endpoint](https://aws.amazon.com/blogs/networking-and-content-delivery/introducing-aws-client-vpn-to-securely-access-aws-and-on-premises-resources/), and associate it with your VPC.
3. And, finally install [Tunnelblick](https://tunnelblick.net) locally to establish the VPN connection.

Note that, the AWS Client VPC service is billed on an hourly basis but it's fairly inexpensive. [Read more on the pricing here](https://aws.amazon.com/vpn/pricing/).

### Connecting to a local DB

Alternatively, you can run the database server locally (ie. MySQL or PostgreSQL). And in your function code, you can connect to a local server if [`IS_LOCAL`](environment-variables.md#is_local) is set:

```js
const dbHost = process.env.IS_LOCAL
  ? "localhost"
  : "amazon-string.rds.amazonaws.com";
```

## Customizing the debug stack

You can customize the debug stack such as [adding tags](../advanced/tagging-resources#tagging-the-debug-stack), and [setting permission boundary](../advanced/permission-boundary#setting-the-permission-boundary-for-the-debug-stack) by using the `debugStack` callback method in your `stacks/index.js`.

```js title="stacks/index.js" {7-9}
import * as cdk from "aws-cdk-lib";

export default function main(app) {
  // define your stacks here
}

export function debugStack(app, stack, props) {
  cdk.Tags.of(app).add("my-stage", props.stage);
}
```

The debug stack is deployed as a CDK app as well. So the `debugStack` method is called with its [`cdk.App`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_core.App.html) and [`cdk.Stack`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_core.Stack.html) instances.

Also passed in is a `props` object of type [`DebugStackProps`](#debugstackprops).

#### DebugStackProps

The `DebugStackProps` contains the following attributes.

**stage**

_Type_ : `string`

The name of the stage that the app (and debug stack) is being deployed to.
