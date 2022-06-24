---
title: Queries and Mutations
---

In GraphQL APIs, the actions you can take are broken down into _Queries_ and _Mutations_. Queries are used for reading data, while Mutations are for writing data or triggering actions.

It's important to be thoughtful about how you design your API. Queries tend to be a bit more straight forward and you typically are just describing all the entities in your system and how they relate.

Mutations however can be a bit trickier to design well. If coming from REST, it's tempting to provide a generic `createArticle` and `updateArticle` mutations. However, it's better to provide granular actions that correlate to business actions. For example it's better to provide specific mutations like `updateArticleTitle` and `publishArticle`. Clients can always batch these together if they want to take multiple actions at once. If you want to learn more about schema design, [check out this fantastic video](https://youtu.be/pJamhW2xPYw).

## Creating a new Mutation

Open `services/functions/graphql/types/article.ts`, and add this above the `createArticle` mutation:

```ts {4-11}
//...

builder.mutationFields(t => ({
  addComment: t.field({
    type: CommentType,
    args: {
      articleID: t.arg.string({ required: true }),
      text: t.arg.string({ required: true })
    },
    resolve: (_, args) => Article.addComment(args.articleID, args.text)
  }),
  createArticle: t.field({

//...
```

Here we added an `addComment` mutation that takes the `articleID` and `text`. It then calls `Article.addComment()` to create a new comment, and returns the created comment.

Next, let's connect these to our frontend React app.
