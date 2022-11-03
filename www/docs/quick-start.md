---
id: quick-start
title: Quick Start
description: "Take SST for a spin and create your first full-stack serverless app."
---

import config from "../config";
import TabItem from "@theme/TabItem";
import HeadlineText from "@site/src/components/HeadlineText";
import MultiPackagerCode from "@site/src/components/MultiPackagerCode";

export const ConsoleUrl = ({url}) =>
<a href={url}>{url.replace("https://","").replace(/\/$/, "")}</a>;

<HeadlineText>

SST is a collection of <a href={ `${ config.github }/tree/master/packages` }>npm packages</a> that allow you to define your infrastructure, write functions, and connect it to your frontend.

</HeadlineText>

---

## 0. Prerequisites

SST is built with Node, so make sure your local machine has it installed; [Node.js 14](https://nodejs.org/) and [npm 7](https://www.npmjs.com/).

---

### AWS credentials

You also need to have an AWS account and AWS credentials configured locally. If you haven't already, [**follow these steps**](advanced/iam-credentials.md#loading-from-a-file).

---

## 1. Create a new app

Create a new SST app using the [`create-sst`](packages/create-sst.md) CLI.

<MultiPackagerCode>
<TabItem value="npm">

```bash
npx create-sst@latest my-sst-app
```

</TabItem>
<TabItem value="yarn">

```bash
yarn create sst my-sst-app
```

</TabItem>
</MultiPackagerCode>

---

### Pick a starter

This will prompt you to select a starter.

```
? What kind of project do you want to create? (Use arrow keys)
❯ graphql
  minimal
  examples
```

The `graphql` starter is a full-stack TypeScript app organized as a monorepo. It comes with a GraphQL API, a frontend React app, and all of our best practices. Let's pick that.

Next, it will prompt you to select a database; either [RDS](https://aws.amazon.com/rds/) (PostgreSQL or MySQL) or [DynamoDB](https://aws.amazon.com/dynamodb/).

```
? Select a database (you can change this later or use both) (Use arrow keys)
  RDS (Postgres or MySQL)
❯ DynamoDB
```

Let's use DynamoDB for now. If you want to use PostgreSQL, [check out our tutorial](learn/index.md), we cover it in detail.

---

### Install dependencies

Next install the dependencies.

<MultiPackagerCode>
<TabItem value="npm">

```bash
cd my-sst-app
npm install
```

</TabItem>
<TabItem value="yarn">

```bash
cd my-sst-app
yarn
```

</TabItem>
</MultiPackagerCode>

---

## 2. Start local environment

Then start the [Live Lambda](live-lambda-development.md) local development environment.

<MultiPackagerCode>
<TabItem value="npm">

```bash
npx sst start
```

</TabItem>
<TabItem value="yarn">

```bash
yarn run start
```

</TabItem>
</MultiPackagerCode>

The first time you run this command in a project, you'll be prompted to enter a default stage name to use.

---

### Pick a stage

SST uses the stage names to namespace your resources.

```
Look like you’re running sst for the first time in this directory. Please enter
a stage name you’d like to use locally. Or hit enter to use the one based on
your AWS credentials (Jay):
```

Just hit **Enter** to select the default one.

<details>
<summary>Behind the scenes</summary>

The name spaced resources lets SST deploy multiple environments of the same app to the same AWS account. So you and your teammates can work together.

The stage name will be stored locally in a `.sst/` directory. It's automatically ignored from Git.

</details>

The initial deploy can take a few minutes. It will deploy your app to AWS, and also setup the infrastructure to support your local development environment.

Once complete, you'll see something like this.

```
==========================
 Starting Live Lambda Dev
==========================

SST Console: https://console.sst.dev/my-sst-app/Jay/local
Debug session started. Listening for requests...
```

Now our app has been **deployed** to **AWS** and it's **connected** to our **local machine**!

---

### Start the frontend

The frontend in our starter is a React app created with [Vite](https://vitejs.dev). Let's start it locally from the `web/` directory.

<MultiPackagerCode>
<TabItem value="npm">

```bash
cd web
npm run dev
```

</TabItem>
<TabItem value="yarn">

```bash
cd web
yarn run dev
```

</TabItem>
</MultiPackagerCode>

Once complete, you can navigate to the URL in your output — `http://localhost:3000/`. You should see the homepage of our starter! It's a simple Reddit clone where you can post links.

:::info
Your frontend is automatically connected to your API on AWS.
:::

Try posting a link.

![SST starter homepage](/img/quick-start/sst-starter-homepage.png)

If you check the developer console in your browser, you'll notice that it's making requests to an endpoint in AWS — `https://cok8brhsqk.execute-api.us-east-1.amazonaws.com/graphql`

---

### Open the console

The `sst start` command also powers a web based dashboard, called the [SST Console](console.md). Head over to the URL above or simply — **<ConsoleUrl url={config.console} />**

Click on the **DynamoDB** tab on the left.

![SST Console DynamoDB tab](/img/quick-start/sst-console-dynamodb.png)

You should see a row for the newly posted link. Note that, just like the GraphQL API above, the database is not running locally, it's on AWS.

---

## 3. Make a change

Let's make a change to our API and see what the workflow is like. Replace the following in `services/functions/graphql/types/article.ts`.

```diff title="services/functions/graphql/types/article.ts" {5-8}
fields: (t) => ({
  id: t.exposeID("articleID"),
  url: t.exposeString("url"),
- title: t.exposeString("title"),
+ title: t.field({
+   type: "String",
+   resolve: (article) => `🔥 ${article.title}`,
+ }),
}),
```

We are editing our GraphQL resolver to format the titles of our articles. Now if you refresh your browser.

![SST starter updated homepage](/img/quick-start/sst-starter-updated-homepage.png)

<details>
<summary>Behind the scenes</summary>

Here's how this all works behind the scenes. All our infrastructure is defined in the `stacks/` directory.

1. Here we define our database in `stacks/Database.ts` using the [`Table`](constructs/Table.md) construct.

   ```ts
   const table = new Table(stack, "table", {
     /** **/
   });
   ```

2. We then define an API using the [`Api`](constructs/Api.md) in `stacks/Api.ts`.

   ```ts
   const api = new ApiGateway(stack, "api", {
     /** **/
   });
   ```

   We bind our database details to the API so our functions can make queries to it.

   ```ts
   function: {
     bind: [db.table],
   },
   ```

3. Next we define our frontend in `stacks/Web.ts` using the [`ViteStaticSite`](constructs/ViteStaticSite.md) construct.

   ```ts
   const site = new ViteStaticSite(stack, "site", {
     /** **/
   });
   ```

   And we pass in our API URL to the frontend.

   ```ts
   environment: {
     VITE_GRAPHQL_URL: api.url + "/graphql",
   },
   ```

4. Finally, we tie these all together in `stacks/index.ts`.

   ```ts
   app.stack(Database).stack(Api).stack(Web);
   ```

   And we specify the directory with our functions code.

   ```ts
   srcPath: "services",
   ```

5. Our function handlers are in the `services/functions/` directory.

6. Finally, our core domain logic or business logic is in the `services/core/` directory. It's organized using [Domain Driven Design](learn/domain-driven-design.md).

The `graphql/` directory is code-genned and allows us to share the backend types in our frontend. It should be committed to Git.

</details>

So to recap, our frontend is running locally and it's talking to our GraphQL API hosted on AWS. However we can make changes to the functions and they get live reloaded.

---

## 4. Deploy to prod

Once you are done working on your app locally, you are ready to go to production. We'll use the `sst deploy` command for this.

We don't want to use the same _stage_ as our local environment since we want to separate our dev and prod environments. So we'll run the `sst deploy` command with the `--stage` option.

<MultiPackagerCode>
<TabItem value="npm">

```bash
npx sst deploy --stage prod
```

</TabItem>
<TabItem value="yarn">

```bash
yarn run deploy --stage prod
```

</TabItem>
</MultiPackagerCode>

This will take a few minutes to run and will create a complete new version of your app. Once complete you'll notice these outputs.

```bash {4,6}
Stack Jay-my-sst-app-Web
  Status: deployed
  Outputs:
    SITE: https://dzennbvva4xas.cloudfront.net
  site:
    VITE_GRAPHQL_URL: https://q14k5arhm8wl.execute-api.us-east-1.amazonaws.com/graphql
```

Our site is now live at `SITE` and it's talking to our GraphQL API at `VITE_API_URL`. You'll notice this is a completely new API endpoint.

You can also add [**custom domains**](constructs/ViteStaticSite.md#custom-domains) to your app and [API](constructs/Api.md#custom-domains), but we'll cover that in a separate tutorial.

---

## 5. Remove the app

Finally to wrap this up, you can remove all your app all its resources from AWS.

<MultiPackagerCode>
<TabItem value="npm">

```bash
npx sst remove
npx sst remove --stage prod
```

</TabItem>
<TabItem value="yarn">

```bash
yarn run remove
yarn run remove --stage prod
```

</TabItem>
</MultiPackagerCode>

This removes the local and prod environments of your app.

:::info
By default, SST does not remove your DynamoDB table. This prevents accidental removals. You'll need to set the [Removal Policy](advanced/removal-policy.md) to force remove it.
:::

---

## 6. Next steps

If you are ready to dive into the details of SST, [**check out our tutorial**](learn/index.md).
