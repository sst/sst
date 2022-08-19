---
title: Add API Types
---

import ChangeText from "@site/src/components/ChangeText";

The GraphQL setup we are using is a _Code-first_ GraphQL setup. This means that we write our schema definitions in TypeScript instead of the [standard GraphQL schema](https://graphql.org/learn/schema/). This allows us to have strong typing along and minimal boilerplate code.

We use [Pothos](https://pothos-graphql.dev/) to do this.

:::info Backing Models
A key concept to understand about Pothos is that there are two different types involved:

1. The underlying types that we get from the database queries we make. More on this later.
2. And, the GraphQL schema types that we define.

You can read more about this over on the [Pothos docs](https://pothos-graphql.dev/docs/guide/schema-builder#backing-models).
:::

In the last chapter we looked at how our GraphQL setup is wired up. if you recall, we build our GraphQL schema in Pothos using a [`SchemaBuilder`](https://pothos-graphql.dev/docs/guide/schema-builder). These GraphQL types are stored in `services/functions/graphql/types/`.

Currently we define the GraphQL schema for our article in `services/functions/graphql/types/article.ts`. It does 3 things — define a type, add a query, and define a mutation.

In this chapter we'll look at how to add the type. We'll look at queries and mutations in the [next chapter](queries-and-mutations.md).

Let's start by looking at what we have so far.

### Defining types

If you open up `services/functions/graphql/types/article.ts`, you'll see that we've define a type for our article.

```ts title="services/functions/graphql/types/article.ts"
const ArticleType = builder.objectRef<SQL.Row["article"]>("Article").implement({
  fields: (t) => ({
    id: t.exposeID("articleID"),
    url: t.exposeString("url"),
    title: t.exposeString("title"),
  }),
});
```

Let's look at what's going on here:

- The `builder` here is the Pothos [`SchemaBuilder`](https://pothos-graphql.dev/docs/guide/schema-builder).
- We are using the `ObjectRef` way of defining a new type. You can read more about this over on the [Pothos docs](https://pothos-graphql.dev/docs/guide/objects#using-refs).
- We are creating a new type called `Article`.
- This is backed by the `SQL.Row["article"]` database type. More on this below.
- We explicitly state the fields we want to expose, along with their types.

:::info Behind the scenes
The `SQL.Row["article"]` is the type for our `article` table. This is defined in `services/core/sql.ts`.

```ts title="services/core/sql.ts"
export type Row = {
  [Key in keyof Database]: Selectable<Database[Key]>;
};
```

Where the `Database[Key]` is coming from `services/core/sql.generated.ts`, where each key is the type for each table.

The types in `services/core/sql.generated.ts` are auto-generated when we run our migrations. We talked about this back in the [Write to PostgreSQL](write-to-postgresql.md) chapter.
:::

Now lets add the `Comment` type for our new feature.

### Create a comment type

<ChangeText>

In `services/functions/graphql/types/article.ts`, add the following above the `ArticleType`.

</ChangeText>

```ts title="services/functions/graphql/types/article.ts"
const CommentType = builder.objectRef<SQL.Row["comment"]>("Comment").implement({
  fields: (t) => ({
    id: t.exposeID("commentID"),
    text: t.exposeString("text"),
  }),
});
```

In this case we are exposing the `commentID` as type `ID` and the comment `text` as a `String`.

## Return the comments

We want to return our comments as a part of the article. So lets edit the existing article type.

<ChangeText>

Add a `comments` field to the `ArticleType` in `services/functions/graphql/types/article.ts`.

</ChangeText>

```ts {6-9} title="services/functions/graphql/types/article.ts"
const ArticleType = builder.objectRef<SQL.Row["article"]>("Article").implement({
  fields: (t) => ({
    id: t.exposeID("articleID"),
    url: t.exposeString("url"),
    title: t.exposeString("title"),
    comments: t.field({
      type: [CommentType],
      resolve: (article) => Article.comments(article.articleID),
    }),
  }),
});
```

Here we are using the `Comment` type from above and defining a resolver. A resolver is a function that does an action, either read or write some data. We'll look at this in detail in the next chapter.

:::info
As opposed to standard GraphQL, in the _code-first_ approach with Pothos, we define the resolvers and the schema together.
:::

So given an `article` object, we get the `articleID` and call `Article.comments()` from `services/core/article.ts`. You'll recall that we implemented this back in the [Write to PostgreSQL](write-to-postgresql.md) chapter.

Now that the types are defined, let's look at the queries and mutations.
