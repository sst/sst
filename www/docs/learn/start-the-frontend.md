---
title: Start the Frontend
---

import ChangeText from "@site/src/components/ChangeText";

We are now ready to start up our frontend locally.

<ChangeText>

Run the following from your project root.

</ChangeText>

```bash
cd web
npm run dev
```

Once our React app is up and running, you should see the following in your terminal.

```bash
vite v2.9.12 dev server running at:

> Local: http://localhost:3000/
> Network: use `--host` to expose

ready in 346ms.
```

Open that link in your browser, `http://localhost:3000/`. You should see the homepage of our app.

### Load the homepage

It displays a list of articles. We currently don't have any links in the system, so this list should be empty.

![Frontend load articles](/img/start-frontend/load-articles.png)

Behind the scenes, this page make a GraphQL query to our database to fetch the list.

Over on the Console; you'll find the [Live Lambda](../live-lambda-development.md) logs in the **Local** tab.

There, should see a `POST /graphql` request being made. And the response body should say `"articles":[]`.

![Console load articles log](/img/start-frontend/console-load-articles-log.png)

:::info Behind the scenes
This seemingly simple workflow deserves a quick _"behind the scenes"_ explanation. Here's what's happening here:

1. Your frontend is running locally.
2. It makes a request to a GraphQL endpoint that's running in AWS.
3. That invokes a Lambda function in AWS.
4. The Lambda function request is then proxied to your local machine.
5. The local version of that function is run.
6. It makes a query to an RDS Postgres database that's in AWS.
6. The logs for the function execution are displayed in the Console.
7. The results of that execution are sent back to AWS.
8. Your frontend then renders those results.

Note that everything here happens in real-time. There's no time spent polling or syncing!
:::

We are not going to test making changes in this chapter, we'll do that next. For now, let's try posting an article.

### Post an article

Type in `Learning SST` for the title, and `https://sst.dev` as the URL. Click **Submit**.

![Create article](/img/start-frontend/create-article.png)

The new article will automatically show up in the homepage.

:::note
If you are using the RDS option as the database, you might notice that it takes a little bit of time for the new article to show up or you might've to refresh the page. This is because locally we are scaling down our cluster. So if it's been idle for a while, it'll take around 30 seconds to come back up.
:::

Again if we head back to the Console, you should see a new `POST /graphql` request log.

![Console create article log](/img/start-frontend/console-create-article-log.png)

Next, let's quickly test our local dev environment by setting a breakpoint.
