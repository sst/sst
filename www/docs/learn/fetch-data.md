---
title: Fetch Data
---

Now that the comments have been added to our GraphQL API, we are ready to connect it to our frontend.

Let's update the fetch articles query to include `comments` in each article.  In `web/src/pages/Article.tsx`, add `comments` in the articles query:

```ts {7-9} title="web/src/pages/Article.tsx"
const [articles] = useTypedQuery({
  query: {
    articles: {
      id: true,
      title: true,
      url: true,
      comments: {
        text: true
      }
    }
  }
});
```

If you refresh the app, you won't see any comments on the page. That's because we aren't rendering the comments yet.

However in the SST Console, you should see the article is returning the comments. In this case it's an empty list, `"comments":[]`.

![Console log for Comments in articles](/img/fetch-data/console-log-for-comments-in-articles.png)

Now let's render the comments.
