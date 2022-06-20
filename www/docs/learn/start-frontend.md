---
id: start-frontend
title: Start Frontend [J]
description: "Start frontend for an SST app"
---

Now let's start up our frontend locally.

```bash
cd web
npm run dev
```

Once the site is up and running, you should see the following printed out in the terminal.

```bash
  vite v2.9.12 dev server running at:

  > Local: http://localhost:3000/
  > Network: use `--host` to expose

  ready in 346ms.
```

Open the link in the browser, you should no articles because we haven't created any.

![](/img/start-frontend/load-articles.png)

By opening this page, a GraphQL query was made to fetch all the articles in the DB. Now back to the Console, if you look at the Live Lambda logs under the `Local` tab, you should see a `POST /graphql` request made. And the response body says `"articles":[]`.

![](/img/start-frontend/console-load-articles-log.png)

Let's add an article. Enter `Learning SST` for the title, and `https://sst.dev` for the url field. Select `Submit`. The new article will automatically show up under Latest.

![](/img/start-frontend/create-article.png)

Now back to the Console, you should see a new `POST /graphql` request responsible for creating the article.

![](/img/start-frontend/console-create-article-log.png)