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

---

![SST Console homescreen](/img/console/sst-console-homescreen.png)

With the Console you can view real-time logs, invoke functions, replay invocations, make queries, run migrations, view uploaded files, query your GraphQL APIs, and more!

:::info Console 2.0
We have a new version of the [SST Console](https://twitter.com/thdxr/status/1681834634374422531) in the works. [Read more about it below](#console-20).
:::

---

## Quick start

To use the SST Console in local development:

1. In your project root, start the [Live Lambda Dev](live-lambda-development.md) environment.

   ```bash
   npx sst dev
   ```

2. You'll see something like this once your local environment is ready.

   ```
   ➜ Stage:   Jay
   ➜ Console: https://console.sst.dev/acme/Jay
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

The GraphQL explorer lets you **query GraphQL endpoints** created with the [`Api`](constructs/Api.md) and [`AppSyncApi`](constructs/AppSyncApi.md) constructs in your app.

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

By default the Console connects to the app you are running locally with `sst dev`. To use the Console with a deployed environment you'll first need to run the [`sst console`](packages/sst.md#sst-console) command.

```bash
npx sst console
```

This will start a server locally and use your local AWS credentials to power the Console.

With this, you can use the Console to **manage apps** that are in **production**. In this mode, the Console will display CloudWatch logs instead of ones from your Live Lambda environment.

---

## Support

The SST Console works in all browsers and environments. But for certain browsers like Safari or Brave, and Gitpod, it needs some additional configuration.

---

### Safari and Brave

Certain browsers like Safari and Brave require the local connection between the browser and the `sst dev` CLI to be running on HTTPS.

SST integrates with [mkcert](https://github.com/FiloSottile/mkcert) to automatically generate a self-signed certificate. To set this up:

1. Follow the mkcert [installation steps](https://github.com/FiloSottile/mkcert#installation).
2. Run `mkcert -install` in your terminal.
3. Restart your browser.
4. Restart `sst dev` and navigate to <ConsoleUrl url={config.console} /> in the browser.

---

### Gitpod

If you are using [Gitpod](https://www.gitpod.io/), you can use the Gitpod Local Companion app to connect to the `sst dev` or `sst console` process running inside your Gitpod workspace.

To get started:

1. [Install Gitpod Local Companion app](https://www.gitpod.io/blog/local-app#installation).
2. [Run the Companion app](https://www.gitpod.io/blog/local-app#running).
3. Navigate to <ConsoleUrl url={config.console} /> in the browser.

The companion app runs locally and creates a tunnelled connection to your Gitpod workspace.

---

## How it works

The <a href={ config.console }>SST Console</a> is a static single-page app hosted at <ConsoleUrl url={config.console} />.

It uses the local credentials from the SST CLI ([`sst dev`](packages/sst.md#sst-dev) or [`sst console`](packages/sst.md#sst-console)) to make calls to your AWS account.

When the Console starts up, it gets the credentials from a local server that is run as a part of the SST CLI. It also gets some metadata from the app that's running locally. The local server only allows access from `localhost` and `console.sst.dev`.

The Console then uses these credentials to make calls to AWS using the AWS SDK. For some resources (like S3), the Console will proxy calls through your local CLI to get around the CORS restrictions in the browser.

:::info
The SST Console requires the SST CLI to be running (either `sst dev` or `sst console`) to work.
:::

When connected to `sst dev`, the Console will display real-time logs from the local invocations of your functions. Whereas, when connected to `sst console`, it'll show you the [CloudWatch](https://aws.amazon.com/cloudwatch/) logs for them instead.

The source for the Console can be viewed in the <a href={`${config.github}/tree/master/packages/console`}>SST GitHub repo</a>.

---

## Console 2.0

We are working on a new version of the SST Console. It'll make it easier to view your logs and manage all your SST apps in production.

![SST Console homescreen](/img/console/sst-console-20.png)

You won't need to run the `sst console` command to view a specific stage. It'll automatically show all the SST apps with their stages in your account.

The new console is also [open source and is built with SST](https://github.com/sst/console).

:::tip
The [new console's codebase](https://github.com/sst/console) is a good example of what a production SST app looks like.
:::

---

### Join the beta

Console 2.0 is currently in public beta. If you'd like to try it out, <a href={config.discord}>join us in #console on Discord</a>.

---

#### What's changing

We are making some key changes with the new version.

1. You'll need to sign up for it

   - You can create an account and create a workspace.

2. You can use it with your team

   - You can also invite your team members to the workspace.

3. The new console is hosted on our side

   - This lets you connect your AWS accounts. It'll deploy a separate CloudFormation stack and connect to any SST apps in it.
   - It also stores some data about your account and your logs on our side.

4. You can view all your apps and stages

   - Once you've connected your AWS accounts, all your apps and stages will show up automatically.
   - You can view logs, invoke functions, or save event payloads as a team.
   - Just as before, you can also view logs in real-time from your local stage.

5. It doesn't support all the [Explorers](#explorers)

   - We are starting with just functions and logs for now.

6. It'll be a paid product

   - You'll be able to view local logs and stages for free.
   - But viewing and searching for production logs will be a paid feature.
   - We'll release pricing details shortly but it'll be based on how often your functions are invoked.

:::info
Just as before, the new console is completely optional to use.
:::

---

#### Frequently asked questions

- When is the new console going live?

  It's currently in public beta and will be going live in the coming weeks.

- What will happen to the old console?

  We'll still keep it around for some time but it'll be moved to a different URL.

- Will there be a free tier?

  We haven't finalized this yet but there will most likely be a free tier for apps that don't have a lot of invocations or logs.

- What if I don't want to pay for it?

  You can still invite your team and use it to view your local stages.

- What happens to Seed?

  [Seed](https://seed.run) also lets you view logs for your SST apps, so there is some overlap between the two products. But Seed will continue to work just as before.

If you have any further questions, feel free to ask us on Discord.
