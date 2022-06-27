---
title: Fetch Data
---

Update the fetch articles query to include `comments` in each article.

Open up `web/src/pages/Article.tsx`, add `comments` in the articles query:

```ts {7-9}
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

If you refresh the page, you won't see any comments on the page. That's fine because we aren't rendering the comments on the page page. But in SST Console, you should see the article has no comments, ie. `"comments":[]`

![Fetch comments](/img/fetch-comments/console-get-articles-log.png)
