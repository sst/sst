---
title: Console
description: "The SST Console is a web based dashboard for managing your SST apps with your team."
---

import config from "../config";
import HeadlineText from "@site/src/components/HeadlineText";

export const ConsoleUrl = ({url}) =>
<a href={url}>{url.replace("https://","").replace(/\/$/, "")}</a>;

<HeadlineText>

The <a href={config.console}>SST Console</a> is a web based dashboard to manage your SST apps.

</HeadlineText>

---

![SST Console homescreen](/img/console/sst-console-logs.png)

With the SST Console you can invoke functions, view and search logs, and manage all your apps with your team — **<ConsoleUrl url={config.console} />**

---

## Quick start

Here's how to get started. <a href={config.console}>Head over to the Console</a> and create an account with your email.

1. **Create a workspace**

   ![SST Console create a workspace](/img/console/sst-console-create-new-workspace.png)
   
   You can add your apps and invite your team to a workspace. A workspace can be for a personal project or for your team at work. You can create as many workspaces as you want.

2. **Connect your AWS account**

   ![SST Console connect an AWS account](/img/console/sst-console-connect-aws-account.png)

   This will ask you to create a CloudFormation stack in your AWS account.

   ![SST Console connect an AWS account](/img/console/sst-console-create-cloudformation-stack.png)

   Make sure that this stack is being added to **us-east-1**. Scroll down and click **Create stack**.

   :::caution
   The CloudFormation stack needs to be created in **us-east-1**. If you create it in the wrong region by mistake, remove it and create it again.
   :::

   This stack will scan all the regions in your account for SST apps and subscribe to them. Once created, you'll see all your apps, stages, and the functions in the apps.

   ![SST Console app resources](/img/console/sst-console-resources.png)

3. **Invite your team**

   ![SST Console invite team](/img/console/sst-console-invite-user.png)

   Use the email address of your teammates to invite them. They just need to login with the email you've used and they'll be able to join your workspace.

---

## Requirements

**SST apps v2.19.2 or newer** are supported by the Console. Note that, apps **older than v2** won't be detected by the Console.

:::note
The SST Console is optional to use. It simply compliments the SST CLI.
:::

---

## How it works

At a high level, here's how the Console works.

1. It's hosted on our side

   - It stores some data about your account and your logs on our side.
   - We'll have a version that can be self-hosted in the future.

2. You can view all your apps and stages

   - Once you've connected your AWS accounts, it'll deploy a separate CloudFormation stack and connect to any SST apps in it.
   - And all your apps and stages will show up automatically.

3. You can manage your apps

   - You can view all the SST Functions in your app.
   - You can view their logs, invoke them, or replay invocations
   - You can also save event payloads to your workspace.
   - For your local [`sst dev`](live-lambda-development.md) stage, the logs will be streamed in real-time from your local machine.

4. It'll be a paid service with a free tier

   - You'll be able to view local logs and stages for free.
   - But viewing and searching for production logs will be a paid feature.
   - We'll release pricing details shortly. But it'll:
     - Have a free tier.
     - Be based on how often your functions are invoked.

4. It doesn't support all the features of the [Old Console](#old-console)

   - We are starting with just functions and logs for now. We might add the other [Explorers](#explorers) in the future.

5. It's open-source, built with SST, and deployed with [Seed](https://seed.run)

   - The Console is a full-stack SST app. You can view the <a href="https://github.com/sst/console">source on GitHub</a>.

:::tip
Viewing local logs in the SST Console will always be free.
:::

---

## Local logs

When the Console starts up, it checks if you are running `sst dev` locally. If so, then it'll show you real-time logs from your local terminal.

<!--
![SST Console tailing local logs](/img/console/sst-console-tailing-local-logs.png)
-->

This works by connecting to a local server that's run as a part of the SST CLI.

:::info
The local server only allows access from `localhost` and `console.sst.dev`.
:::

The local logs works in all browsers and environments. But for certain browsers like Safari or Brave, and Gitpod, it needs some additional configuration.

---

### Safari & Brave

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

## Getting help

The SST Console is currently in beta. So if you have any questions or if you need help, <a href={config.discord}>**join us in #console on Discord**</a>.

---

## Old Console


The Old SST Console is a static single-page app hosted at <ConsoleUrl url="https://old.console.sst.dev" />.

:::info
We'll be moving away from the Old Console in the future.
:::

#### Explorers

The Old Console has separate tabs or _explorers_ for managing the different parts of your application.

- Logs

  View **real-time logs** from your [Live Lambda Dev](live-lambda-development.md) environment.

- Stacks

  View all the deployed **stacks** and **resources** in your app.

- Functions

  **Invoke** the functions in your app and **replay** invocations.

- API

  The API explorer lets you **make HTTP requests** to any of the routes in your [`Api`](constructs/Api.md) and [`ApiGatewayV1Api`](constructs/ApiGatewayV1Api.md) constructs.

  Set the headers, query params, request body, and view the function logs in the response.

- RDS

  The RDS explorer allows you to manage the RDS instance created with the [`RDS`](constructs/RDS.md) constructs in your app.

  You can use the **query editor** to run queries. You can also use the migrations panel to view all of your **migrations and apply them**.

- Buckets

  The Buckets explorer allows you to manage the S3 Buckets created with the [`Bucket`](constructs/Bucket.md) constructs in your app.

  It allows you to **upload**, **delete**, and **download** files. You can also create and delete folders.

- GraphQL

  The GraphQL explorer lets you **query GraphQL endpoints** created with the [`Api`](constructs/Api.md) and [`AppSyncApi`](constructs/AppSyncApi.md) constructs in your app.

- Cognito

  The Cognito explorer allows you to manage the User Pools created with the [`Cognito`](constructs/Cognito.md) constructs in your app.

  It allows you to **create** new users and **delete** existing **users**.

- DynamoDB

  The DynamoDB explorer lets you **query the DynamoDB** tables in the [`Table`](constructs/Table.md) constructs in your app.

  You can scan the table, query specific keys, create and edit items.

---

## FAQ

- How much will it cost to use the Console?

  We haven't finalized this yet but it'll be based on how often your functions are invoked in production.

- Will there be a free tier?

  The Console will most likely be free if you are just starting out on your app or it doesn't have a lot of usage yet.

- What if I don't want to pay for the Console?

  You can still invite your team and use it to view your local logs and stages.

- Why did we move away from the Old Console?

  It required you to run a command when you wanted to view logs for a specific stage. It also was purely a client-side app, this made it very limited for viewing or searching production logs.

- What will happen to the [Old Console](#old-console)?

  It'll be available at <ConsoleUrl url="https://old.console.sst.dev" /> for some time but we'll be moving away from it.

- What will happen to Seed?

  [Seed](https://seed.run) also lets you view logs for your SST apps, so there is some overlap between the two products. But Seed will continue to work just as before.

If you have any further questions, feel free to ask us on Discord.
