---
title: Start the Frontend
---

import ChangeText from "@site/src/components/ChangeText";

We are now ready to move on to the frontend.

You can start your frontend app locally, like you normally would. And it can connect to the API that's running using SST's [Live Lambda Dev](../live-lambda-development.md). That way you can make changes live in your API and it'll reflect right away in the frontend.

---

## Start frontend

So let's go ahead and start our frontend.

<ChangeText>

Run the following in your project root.

</ChangeText>

```bash
cd packages/frontend
npm run dev
```

You'll recall from the [Project Structure](project-structure.md#web) chapter that the starter comes with a React app created using [Vite](https://vitejs.dev/).

Once our React app is up and running, you should see the following in your terminal.

```bash
vite v2.9.12 dev server running at:

> Local: http://localhost:3000/
> Network: use `--host` to expose

ready in 346ms.
```

Open that link in your browser, `http://localhost:3000/`. You should see the homepage of our app.

---

## Load the homepage

It displays a list of articles. We currently don't have any links in the system, so this list should be empty.

![Frontend load homepage](/img/start-frontend/load-homepage.png)

Over on the Console; you'll find the [Live Lambda](../live-lambda-development.md) logs in the **Local** tab.

There, should see a `POST /graphql` request that was made. And the response body should say `"articles":[]`.

![Console load articles log](/img/start-frontend/console-load-articles-log.png)

<details>
<summary>Behind the scenes</summary>

This seemingly simple workflow deserves a quick _behind the scenes_ look. Here's what's happening:

1. Your frontend is running locally.
2. It makes a request to a GraphQL endpoint that's running in AWS.
3. That invokes a Lambda function in AWS.
4. The Lambda function request is then proxied to your local machine.
5. The local version of that function is run.
6. It makes a query to an RDS Postgres database that's in AWS.
7. The logs for the function execution are displayed in the Console.
8. The results of that execution are sent back to AWS.
9. Your frontend then renders those results.

Note that everything here happens in real-time. There's no polling or syncing!

</details>

Let's try posting an article.

---

## Post an article

Type in `Learning SST` as the title, and `https://sst.dev` for the URL. Click **Submit**.

![Create article](/img/start-frontend/create-article.png)

You should see a page with the new article.

Again if we head back to the Console, you should see a new `POST /graphql` request. This time, creating creating the new article.

![Console create article log](/img/start-frontend/console-create-article-log.png)

---

Next, let's quickly test our local dev environment by setting a breakpoint.
