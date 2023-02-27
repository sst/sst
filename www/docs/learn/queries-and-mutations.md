---
title: Queries and Mutations
---

import ChangeText from "@site/src/components/ChangeText";

In GraphQL APIs, the actions you can take are broken down into _Queries_ and _Mutations_. Queries are used for reading data, while Mutations are for writing data or triggering actions.

Let's look at how these work in our app.

---

## Define queries

To start with we have two queries. One to fetch a single article, called `article`. And another to fetch all the articles, called `articles`.

```ts title="packages/functions/src/graphql/types/article.ts" {2,11}
builder.queryFields((t) => ({
  article: t.field({
    type: ArticleType,
    args: {
      articleID: t.arg.string({ required: true }),
    },
    resolve: async (_, args) => {
      // ...
    },
  }),
  articles: t.field({
    type: [ArticleType],
    resolve: () => Article.list(),
  }),
}));
```

A query needs to define:

1. The return `type`.
2. A function on how to `resolve` the query.
3. And optionally take any `args` needed to resolve the query.

The `article` query above returns a single article given an article id.

- The return `type` here is the `ArticleType`, that we defined in the [last chapter](add-api-types.md#defining-types).
- It needs the article id as an argument. So we define `articleID` in the `args`. We also specify its type as a string and set it as `required: true`.
- Finally, we have a function to `resolve` the query. It grabs the `articleID` and calls the `Article.get()` domain function in `packages/core/src/article.ts`.

On the other hand, the `articles` query returns a list of articles of type `ArticleType` with a resolver that calls the `Article.list()` domain function.

---

## Define mutations

Mutations are similar to queries but are meant for writing data or for triggering actions. For our app, we need a mutation that can create an article.

```ts title="packages/functions/src/graphql/types/article.ts"
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

Just like queries; mutations have a `resolve` function that takes `args` and has a return `type`.

The `createArticle` mutation, we take two arguments, `title` and `url`. It then calls our domain function `Article.create()` and returns the newly created article of type `ArticleType`.

That at a very high level is how GraphQL works. You define the type for an object, add a query for how to fetch it, and a mutation for how to create or update it.

---

## Create a new mutation

Let's add a mutation to create a comment.

<ChangeText>

In `packages/functions/src/graphql/types/article.ts`, add this above the `createArticle` mutation:

</ChangeText>

```ts title="packages/functions/src/graphql/types/article.ts"
addComment: t.field({
  type: CommentType,
  args: {
    articleID: t.arg.string({ required: true }),
    text: t.arg.string({ required: true }),
  },
  resolve: (_, args) => Article.addComment(args.articleID, args.text),
}),
```

Similar to the `createArticle` mutation, it takes the `articleID` and `text` as `args`. And calls `Article.addComment()` domain function to create a new comment. It returns the new comment of type `CommentType`. Recall that we added the new `CommentType` in the [last chapter](add-api-types.md#create-a-comment-type).

<details>
<summary>Behind the scenes</summary>

We have some tips on how to design GraphQL APIs before we move on.

GraphQL API design is a little different from REST API design.

In the case of REST APIs, you are designing around single HTTP requests. So it makes more sense to create endpoints that do a lot of things together.

However, in GraphQL, clients can always batch multiple calls together in a single request. So it's important to be thoughtful about how you design your API.

Queries tend to be a bit more straight forward. You typically are just describing all the entities in your system and how they relate.

While, mutations can be a bit trickier to design. It makes more sense to provide specific mutations that correlate to business actions.

For example, instead of a generic `updateArticle` method, it makes more sense to write specific mutations like `updateArticleTitle` and `updateArticleUrl`. This is because:

1. Our frontend can make granular changes.
2. And if we trigger both the mutations, the frontend GraphQL client can just batch them together.

So we get the best of both worlds!

If you want to learn more about GraphQL schema design, make sure to [check out this fantastic video](https://youtu.be/pJamhW2xPYw).

</details>

Our API is now complete! It supports our new comments feature!

---

Let's connect these to our frontend React app.
