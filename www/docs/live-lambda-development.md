---
id: live-lambda-development
title: Live Lambda Development
description: SST includes a Live Lambda Development environment that allows you to work on your Lambda functions live.
---

import useBaseUrl from "@docusaurus/useBaseUrl";
import config from "../config";

SST includes a Live Lambda Development environment. Let's look at this in detail.

## Background

Working on Lambda functions locally can be painful. You have to either:

1. Locally mock all the services that your Lambda function uses

Like API Gateway, SNS, SQS, etc. This is hard to do. If you are using a tool that mocks a specific service (like API Gateway), you won't be able to test a Lambda that's invoked by a different service (like SNS). On the other hand a service like LocalStack, that tries to mock a whole suite of services, is slow and the mocked services can be out of date.

2. Or, you'll need to deploy your changes to test them

Each deployment can take at least a minute and if your internet connection is not great, then the feedback loop can be really slow.

## `sst start`

To fix this, we created `sst start`. A local development environment for Lambda. This command does a couple of things:

1. It deploys a _debug stack_ with a WebSocket API to the same AWS account and region as your app.
2. It deploys your app and replaces the Lambda functions with a _stub_ Lambda.
3. Starts up a local WebSocket client to connect to the debug stack.

The debug stack contains a serverless WebSocket API and a DynamoDB table. The stub Lambda when invoked, sends a message to the WebSocket API, which in turn sends a message to the local client connected to it. The client then executes the local version of the Lambda function and sends back the results to the WebSocket API. Which then responds to the stub Lambda. And finally the stub Lambda responds back with the results.

## An example

Let's look at an example.

<img alt="sst start demo architecture" src={useBaseUrl("img/sst-start-demo-architecture.png")} />

In this sample app we have:

- An API Gateway endpoint
- An SNS topic
- A Lambda function (api.js) that responds to the API and sends a message to the SNS topic
- A Lambda function (sns.js) that subscribes to the SNS topic

So when a request is made to the API endpoint, the stub version of api.js gets invoked and sends a message to the debug stack. This in turn gets streamed to the client. The client invokes the local version of api.js and returns the results to the debug stack. The local version also sends a message to the SNS topic. Meanwhile, the stub api.js responds to the API request with the results. Now the stub version of sns.js gets invoked as it is subscribed to the SNS topic. This gets sent to the debug stack which in turn gets streamed to the client to execute the local version of sns.js. The results of this are streamed back to stub sns.js that responds with the results.

You can [try out this sample repo here](https://github.com/serverless-stack/sst-start-demo) and [read about the **sst start** command here](packages/cli.md#start).

## Advantages

This approach has a couple of advantages.

- You can work on your Lambda functions locally
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
  - Support for connecting to AWS resources inside VPC is coming soon
