---
title: SST Console
description: "The SST Console is a web based dashboard to manage your SST apps."
---

import config from "../config";

export const ConsoleUrl = ({url}) =>
<a href={url}>{url.replace("https://","").replace(/\/$/, "")}</a>;

The SST Console is a web based dashboard to manage your SST apps — **<ConsoleUrl url={config.console} />**

![SST Console homescreen](/img/console/sst-console-homescreen.png)

:::note
The SST Console now supports Safari and Brave. [Learn more below](#working-with-safari-or-brave).
:::

## Features

The SST Console does a couple of things:

- Display **real-time logs** from your [Live Lambda Dev](live-lambda-development.md) environment

  ![SST Console Local tab](/img/console/sst-console-local-tab.png)

- Shows you all the deployed **resources** in your app

  ![SST Console Stacks tab](/img/console/sst-console-stacks-tab.png)

- Allows you to **invoke** your functions and **replay** invocations

  ![SST Console Functions tab](/img/console/sst-console-functions-tab.png)

:::info
Using the SST Console? Have some feedback or feature requests? <a href={ config.discord_invite }>Join us on Discord</a> and head over to the #console channel.
:::

## Explorers

The SST Console also has dedicated tabs or _explorers_ for specific resources.

### API

![SST Console API tab](/img/console/sst-console-api-tab.png)

The API explorer lets you make HTTP requests to any of the routes in your [`Api`](constructs/Api.md) and [`ApiGatewayV1Api`](constructs/ApiGatewayV1Api.md) constructs. Set the headers, query params, request body, and view the function logs with the response.

### DynamoDB

![SST Console DynamoDB tab](/img/console/sst-console-dynamodb-tab.png)

The DynamoDB explorer allows you to query the DynamoDB tables in the [`Table`](constructs/Table.md) constructs in your app. You can scan the table, query specific keys, create and edit items.

### RDS

![SST Console RDS tab](/img/console/sst-console-rds-tab.png)

The RDS explorer allows you to manage the RDS instance created with the [`RDS`](constructs/RDS.md) constructs in your app. You can use the query editor to run queries. You can also use the migrations panel to view all of your migrations and apply them.

### Buckets

![SST Console Buckets tab](/img/console/sst-console-buckets-tab.png)

The Buckets explorer allows you to manage the S3 Buckets created with the [`Bucket`](constructs/Bucket.md) constructs in your app. It allows you upload, delete, and download files. You can also create and delete folders.

### GraphQL

![SST Console GraphQL tab](/img/console/sst-console-graphql-tab.png)

The GraphQL explorer lets you query GraphQL endpoints created with the [`GraphQLApi`](constructs/GraphQLApi.md) and [`AppSyncApi`](constructs/AppSyncApi.md) constructs in your app.

### Cognito

![SST Console Cognito tab](/img/console/sst-console-cognito-tab.png)

The Cognito explorer allows you to manage the User Pools created with the [`Cognito`](constructs/Cognito.md) constructs in your app. It allows you create new users and delete existing users.

## Modes

The SST Console operates in two separate modes; when it connects through the `sst start` or `sst console` command.

### Connecting to Live Lambda Dev

When you run [`sst start`](packages/cli.md#start), the SST CLI will print out a link to the console that can connect to your local environment.

```
$ npx sst start

==========================
Starting Live Lambda Dev
==========================

SST Console: https://console.sst.dev/acme/Jay
Debug session started. Listening for requests...
```

### Connecting to deployed environments

Alternatively, you can run [`sst console`](packages/cli.md#console) and specify the stage you want the console to connect to.

```
$ npx sst console --stage prod

SST Console: https://console.sst.dev/acme/prod
```

This allows you look at logs in production and manage resources in production as well.

## Working with Gitpod

If you are using [Gitpod](https://www.gitpod.io/), you can use the Gitpod Local Companion app to connect to the `sst start` or `sst console` process running inside your Gitpod workspace.

The companion app runs locally and create a tunneled connection to your Gitpod workspace.

To get started:

1. [Install Gitpod Local Companion app](https://www.gitpod.io/blog/local-app#installation).
2. [Run the Companion app](https://www.gitpod.io/blog/local-app#running).
3. Navigate to <ConsoleUrl url={config.console} /> in the browser.

## Working with Safari or Brave

Certain browsers like Safari and Brave require the local connection between the browser and the `sst start` CLI to be running on HTTPS. SST integrates with [mkcert](https://github.com/FiloSottile/mkcert) to automatically generate a self-signed certificate. To set this up:

1. Follow the mkcert [installation steps](https://github.com/FiloSottile/mkcert#installation).
2. Run `mkcert -install` in your terminal.
3. Restart your browser.
4. Restart `sst start` and navigate to <ConsoleUrl url={config.console} /> in the browser.

## How it works

The <a href={ config.console }>SST Console</a> is a hosted single-page app. It uses the local credentials from the SST CLI ([`sst start`](packages/cli.md#start) or [`sst console`](packages/cli.md#console)) to make calls to AWS.

When the Console starts up, it gets the credentials from a local server that is run as a part of the SST CLI. It also gets some metadata from the app that's running locally. The local server only allows access from localhost and console.sst.dev.

The Console then uses these credentials to make calls to AWS using the AWS SDK. For some resources (like S3), the Console will proxy calls through your local CLI to get around the CORS restrictions in the browser.

:::info
The SST Console requires the SST CLI to be running (either `sst start` or `sst console`) to work.
:::

When connected to `sst start`, the Console will display real-time logs from the local invocations of your functions. Whereas, when connected to `sst console`, it'll show you the [CloudWatch](https://aws.amazon.com/cloudwatch/) logs for them instead.

The source for the console can be viewed in the <a href={`${config.github}/tree/master/packages/console`}>SST GitHub repo</a>.
