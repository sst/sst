---
title: Start the Frontend
---

We are now ready to start up our frontend.

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

Open the link in your browser. The homepage should display a list of articles. We currently don't have any links in the system, so this list should be empty.

![Frontend load articles](/img/start-frontend/load-articles.png)

Behind the scenes, this page make a GraphQL query to our database.

Back in the Console; you'll find the Live Lambda logs under the **Local** tab. You should see a `POST /graphql` request being made. And the response body should say `"articles":[]`.

![Console load articles log](/img/start-frontend/console-load-articles-log.png)

Let's add an article. Type in `Learning SST` for the title, and `https://sst.dev` as the URL. Click **Submit**. The new article will automatically show up in the homepage.

![Create article](/img/start-frontend/create-article.png)

Again if we head back to the Console, you should see a new `POST /graphql` request log. The request that was responsible for creating the article.

![Console create article log](/img/start-frontend/console-create-article-log.png)

Next, let's quickly test our local dev environment by setting a breakpoint.
