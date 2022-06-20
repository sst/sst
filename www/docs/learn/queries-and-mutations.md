---
id: queries-and-mutations
title: Queries and Mutations
description: "GraphQL Queries and Mutations for an SST app"
---

In GraphQL APIs the actions you can take are broken down into Queries and Mutations. Queries are used for reading information out and Mutations are for writing data or triggering actions.

It's important to be thoughtful about how you design your API. Queries tend to be a bit more straight forward and you typically are just describing all the entities in your system and how they relate.

Mutations however can be a bit trickier to design well. If coming from REST, it's tempting to provide generic `createArticle` and `updateArticle` mutations. However, it is better to provide granular actions that correlate to business actions. For example it's better to provide specific mutations like `updateArticleTitle` and `publishArticle`. Clients can always batch these together if they want to take multiple actions at once. If you want to learn more about this [here is a fantastic video](https://youtu.be/pJamhW2xPYw) on how to think about schema design.

## Add `addComment` Mutations

Open up `api/functions/graphql/types/article.ts`, and add this above the `createArticle` mutation:

```ts {3-10}
...
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
...
```

Test querying in GraphQL explorer (F)
