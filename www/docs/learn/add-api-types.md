---
title: Add API Types
---

We don't want to just return a comment as a string from an API. We want to return a comment object that contains the comment id, text, and creation date. So let's create a `Comment` type.

## Create Comment type

In `services/functions/graphql/types/article.ts` add this above the `ArticleType`. In Pothos you can specify the types for the underlying resource that the GraphQL Object is backed by. This will vary depending on which database you chose.

- **DynamoDB** `Article.CommentTypeEntity`
- **RDS** `SQL.Row["comment"]`

```ts
const CommentType = builder.objectRef<[specify type]>("Comment").implement({
  fields: t => ({
    id: t.exposeString("commentID"),
    text: t.exposeString("text")
  })
});
```

Here our `CommentType` is exposing the fields from a row in the `comment` table. It's also defining the type for those fields.

## Update Article type

We'll also add a `comments` field to the `ArticleType`. Replace `ArticleType` with:

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

Now when the API returns an `Article` with `comments`, we'll call the `Article.comments()` function from the core package. It'll fetch the comments from the database, and return a list of comments, ie. `[CommentType]`.

Next, let's update our API to be able to add a new comment.
