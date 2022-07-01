---
title: Queries and Mutations
---

In GraphQL APIs, the actions you can take are broken down into _Queries_ and _Mutations_. Queries are used for reading data, while Mutations are for writing data or triggering actions.

## API Design

It's important to be thoughtful about how you design your API. Queries tend to be a bit more straight forward and you typically are just describing all the entities in your system and how they relate.

Mutations however can be a bit trickier to design well. If you are coming from REST, it's tempting to provide a generic `createArticle` or `updateArticle` mutation. However, it's better to provide granular actions that correlate to business actions.

For example, it's better to provide specific mutations like `updateArticleTitle` and `publishArticle`. Clients can always batch these together if they want to take multiple actions at once. If you want to learn more about schema design, make sure to [check out this fantastic video](https://youtu.be/pJamhW2xPYw).

## Create a new Mutation

Open `services/functions/graphql/types/article.ts`, and add this above the `createArticle` mutation:

```ts {4-11} title="services/functions/graphql/types/article.ts"
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

Here we added an `addComment` mutation. It takes the `articleID` and `text` and  calls `Article.addComment()` to create a new comment. And it returns the new comment.

Next, let's connect these to our frontend React app.
