---
id: add-api-types
title: Adding API Types
description: "Adding API Types for an SST app"
---

We don't want to just return a comment as a string from an API. We want to return an object that contains the comment ID, text, and creation date. Let's create a Comment type.

## Create Comment type

Open up `api/functions/graphql/types/article.ts`, and add this above the `ArticleType`:

```ts
const CommentType = builder.objectRef<SQL.Row["comment"]>("Comment").implement({
  fields: t => ({
    id: t.exposeString("commentID"),
    text: t.exposeString("text")
  })
});
```

## Update Article type

We will also added a `comments` field to the `ArticleType`. Replace `ArticleType` with:
```ts {6-9}
const ArticleType = builder.objectRef<SQL.Row["article"]>("Article").implement({
  fields: t => ({
    id: t.exposeID("articleID"),
    title: t.exposeID("title"),
    url: t.exposeID("url"),
    comments: t.field({
      type: [CommentType],
      resolve: article => Article.comments(article.articleID)
    }),
  })
});
```

Now whenever the API returns an Article with `comments`, we will call the `Article.comments()` to fetch the comments from the database, and return a list of comments, ie. `[CommentType]`.

Next, let's update our API to be able to add a new comment.