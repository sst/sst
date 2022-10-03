---
title: SST Console
description: "The SST Console is a web based dashboard to manage your SST apps."
---

import config from "../config";
import HeadlineText from "@site/src/components/HeadlineText";

export const ConsoleUrl = ({url}) =>
<a href={url}>{url.replace("https://","").replace(/\/$/, "")}</a>;

<HeadlineText>

The <a href={config.console}>SST Console</a> is a web based dashboard to manage your SST apps.

</HeadlineText>

![SST Console homescreen](/img/console/sst-console-homescreen.png)

With the Console you can view real-time logs, invoke functions, replay invocations, make queries, run migrations, view uploaded files, query your GraphQL APIs, and more!

---

## How to use

To use the SST Console in local development:

1. In your project root, start the [Live Lambda Dev](live-lambda-development.md) environment.

   ```bash
   npx sst start
   ```

2. You'll see something like this once your local environment is ready.

   ```
   ==========================
   Starting Live Lambda Dev
   ==========================

   SST Console: https://console.sst.dev/acme/Jay
   Debug session started. Listening for requests...
   ```

3. Head over to the printed URL or — **<ConsoleUrl url={config.console} />**

It'll connect to the app you are working on locally. You can read more about [how this works](#how-it-works) below.

---

## Explorers

The SST Console has separate tabs or _explorers_ for managing the different parts of your application.

---

### Logs

View **real-time logs** from your [Live Lambda Dev](live-lambda-development.md) environment.

![SST Console Local tab](/img/console/sst-console-local-tab.png)

---

### Stacks

View all the deployed **stacks** and **resources** in your app.

![SST Console Stacks tab](/img/console/sst-console-stacks-tab.png)

---

### Functions

**Invoke** the functions in your app and **replay** invocations.

![SST Console Functions tab](/img/console/sst-console-functions-tab.png)

---

### API

The API explorer lets you **make HTTP requests** to any of the routes in your [`Api`](constructs/Api.md) and [`ApiGatewayV1Api`](constructs/ApiGatewayV1Api.md) constructs.

![SST Console API tab](/img/console/sst-console-api-tab.png)

Set the headers, query params, request body, and view the function logs in the response.

---

### RDS

The RDS explorer allows you to manage the RDS instance created with the [`RDS`](constructs/RDS.md) constructs in your app.

![SST Console RDS tab](/img/console/sst-console-rds-tab.png)

You can use the **query editor** to run queries. You can also use the migrations panel to view all of your **migrations and apply them**.

---

### Buckets

The Buckets explorer allows you to manage the S3 Buckets created with the [`Bucket`](constructs/Bucket.md) constructs in your app.

![SST Console Buckets tab](/img/console/sst-console-buckets-tab.png)

It allows you to **upload**, **delete**, and **download** files. You can also create and delete folders.

---

### GraphQL

The GraphQL explorer lets you **query GraphQL endpoints** created with the [`GraphQLApi`](constructs/GraphQLApi.md) and [`AppSyncApi`](constructs/AppSyncApi.md) constructs in your app.

![SST Console GraphQL tab](/img/console/sst-console-graphql-tab.png)

---

### Cognito

The Cognito explorer allows you to manage the User Pools created with the [`Cognito`](constructs/Cognito.md) constructs in your app.

![SST Console Cognito tab](/img/console/sst-console-cognito-tab.png)

It allows you to **create** new users and **delete** existing **users**.

---

### DynamoDB

The DynamoDB explorer lets you **query the DynamoDB** tables in the [`Table`](constructs/Table.md) constructs in your app.

![SST Console DynamoDB tab](/img/console/sst-console-dynamodb-tab.png)

You can scan the table, query specific keys, create and edit items.

---

## Deployed environments

By default the Console connects to the app you are running locally with `sst start`. To use the Console with a deployed environment you'll first need to run the [`sst console`](packages/cli.md#console) command.

```bash
$ npx sst console

SST Console: https://console.sst.dev/acme/prod
```

This will start a server locally and use your local AWS credentials to power the Console.

With this, you can use the Console to **manage apps** that are in **production**. In this mode, the Console will display CloudWatch logs instead of ones from your Live Lambda environment.

---

## Support

The SST Console works in all browsers and environments. But for certain browsers like Safari or Brave, and Gitpod, it needs some additional configuration.

---

### Safari and Brave

Certain browsers like Safari and Brave require the local connection between the browser and the `sst start` CLI to be running on HTTPS.

SST integrates with [mkcert](https://github.com/FiloSottile/mkcert) to automatically generate a self-signed certificate. To set this up:

1. Follow the mkcert [installation steps](https://github.com/FiloSottile/mkcert#installation).
2. Run `mkcert -install` in your terminal.
3. Restart your browser.
4. Restart `sst start` and navigate to <ConsoleUrl url={config.console} /> in the browser.

---

### Gitpod

If you are using [Gitpod](https://www.gitpod.io/), you can use the Gitpod Local Companion app to connect to the `sst start` or `sst console` process running inside your Gitpod workspace.

To get started:

1. [Install Gitpod Local Companion app](https://www.gitpod.io/blog/local-app#installation).
2. [Run the Companion app](https://www.gitpod.io/blog/local-app#running).
3. Navigate to <ConsoleUrl url={config.console} /> in the browser.

The companion app runs locally and creates a tunnelled connection to your Gitpod workspace.

---

## How it works

The <a href={ config.console }>SST Console</a> is a static single-page app hosted at <ConsoleUrl url={config.console} />.

It uses the local credentials from the SST CLI ([`sst start`](packages/cli.md#start) or [`sst console`](packages/cli.md#console)) to make calls to your AWS account.

When the Console starts up, it gets the credentials from a local server that is run as a part of the SST CLI. It also gets some metadata from the app that's running locally. The local server only allows access from `localhost` and `console.sst.dev`.

The Console then uses these credentials to make calls to AWS using the AWS SDK. For some resources (like S3), the Console will proxy calls through your local CLI to get around the CORS restrictions in the browser.

:::info
The SST Console requires the SST CLI to be running (either `sst start` or `sst console`) to work.
:::

When connected to `sst start`, the Console will display real-time logs from the local invocations of your functions. Whereas, when connected to `sst console`, it'll show you the [CloudWatch](https://aws.amazon.com/cloudwatch/) logs for them instead.

The source for the Console can be viewed in the <a href={`${config.github}/tree/master/packages/console`}>SST GitHub repo</a>.
