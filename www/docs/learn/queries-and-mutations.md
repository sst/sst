---
title: Queries and Mutations
---

import ChangeText from "@site/src/components/ChangeText";

In GraphQL APIs, the actions you can take are broken down into _Queries_ and _Mutations_. Queries are used for reading data, while Mutations are for writing data or triggering actions.

Let's look at what we have setup.

### Define Queries

We need a query to fetch all the articles. Recall that we added a `Article.list()` function in `services/core/article.ts` back in the [Write to PostgreSQL](write-to-postgresql.md) chapter.

To define the query we'll use that call and the article type that we looked at in the last chapter.

```ts title="services/functions/graphql/types/article.ts"
builder.queryFields((t) => ({
 articles: t.field({
   type: [ArticleType],
   resolve: () => Article.list(),
 }),
}));
```

Here we are defining a new query called `articles`, setting the type it returns, and a resolver function.

### Define Mutations

Just like above, we use the type and the `Article.create()` call to define a mutation called `createArticle`.

```ts title="services/functions/graphql/types/article.ts"
builder.mutationFields((t) => ({
 createArticle: t.field({
   type: ArticleType,
   args: {
     title: t.arg.string({ required: true }),
     url: t.arg.string({ required: true }),
   },
   resolve: (_, args) => Article.create(args.title, args.url),
 }),
}));
```

Aside from the type and resolver, we also need to specify the types of arguments it takes. We do this by setting the `args`. In this case, we need two strings called `title` and `url` to create a new article. These `args` get passed into our resolver.

:::tip GraphQL API Design
GraphQL API design is a little different from REST API design.

In the case of REST APIs, you are designing around single HTTP requests. So it makes more sense to create endpoints that do a lot of things together.

However, in GraphQL, clients can always batch multiple calls together in a single request. So it's important to be thoughtful about how you design your API. Queries tend to be a bit more straight forward and you typically are just describing all the entities in your system and how they relate.

Mutations can be a bit trickier to design well. It makes more sense to probide specific mutations that correlate to business actions.

So for example, instead of a generic `updateArticle` method, it makes more sense to write specific mutations like `updateArticleTitle` or `updateArticleUrl`. This makes for better design on both the backend side and the frontend side.

If you want to learn more about schema design, make sure to [check out this fantastic video](https://youtu.be/pJamhW2xPYw).
:::

That at a very high level is how GraphQL works. You define the type for an object, add a query for how to fetch it, and a mutation for how to create or update it.

### Create a new Mutation

Let's add a mutation to create a comment.

<ChangeText>

In `services/functions/graphql/types/article.ts`, and add this above the `createArticle` mutation:

</ChangeText>

```ts title="services/functions/graphql/types/article.ts"
addComment: t.field({
  type: CommentType,
  args: {
    articleID: t.arg.string({ required: true }),
    text: t.arg.string({ required: true })
  },
  resolve: (_, args) => Article.addComment(args.articleID, args.text)
}),
```

Similar to the `createArticle` mutation, it takes the `articleID` and `text` as `args`. And  calls `Article.addComment()` to create a new comment. And it returns the new comment as a `CommentType`.

Next, let's connect these to our frontend React app.
