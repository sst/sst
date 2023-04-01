---
title: Add API Types
---

import ChangeText from "@site/src/components/ChangeText";

The GraphQL setup we are using is a _Code-first_ GraphQL setup. This means that we write our schema definitions in TypeScript instead of the [standard GraphQL schema](https://graphql.org/learn/schema/). This allows us to have strong typing along with and minimal boilerplate code.

We'll be using [Pothos](https://pothos-graphql.dev/) to do this.

---

## Backing models

A key concept to understand about Pothos is that there are two different types involved:

1. The underlying types that we get from the database queries we make. More on this later.
2. And, the GraphQL schema types that we define.

You can read more about this over on the [Pothos docs](https://pothos-graphql.dev/docs/guide/schema-builder#backing-models).

<details>
<summary>Behind the scenes</summary>

In the last chapter, we looked at how our GraphQL setup is wired up.

If you recall, we build our GraphQL schema in Pothos using a [`SchemaBuilder`](https://pothos-graphql.dev/docs/guide/schema-builder). These GraphQL types are stored in `packages/functions/src/graphql/types/`.

</details>

Currently we define the GraphQL schema for our _article_ in `packages/functions/src/graphql/types/article.ts`. We do three things there — define a type, add a query, and define a mutation.

In this chapter we'll look at how to define the types. While in the [next chapter](queries-and-mutations.md), we'll look at queries and mutations.

Let's start by looking at what we have so far.

---

## Defining types

If you open up `packages/functions/src/graphql/types/article.ts`, you'll see that we've defined a type for our article.

```ts title="packages/functions/src/graphql/types/article.ts"
const ArticleType = builder.objectRef<SQL.Row["article"]>("Article").implement({
  fields: (t) => ({
    id: t.exposeID("articleID"),
    url: t.exposeString("url"),
    title: t.exposeString("title"),
  }),
});
```

Let's look at what's going on here:

- The `builder` is the Pothos [`SchemaBuilder`](https://pothos-graphql.dev/docs/guide/schema-builder).
- We are using the `ObjectRef` way of defining a new type. You can read more about this over on the [Pothos docs](https://pothos-graphql.dev/docs/guide/objects#using-refs).
- We are creating a new type called `Article`.
- This is backed by the `SQL.Row["article"]` database type. More on this below.
- We explicitly state the fields we want to expose and specify their types.

<details>
<summary>Behind the scenes</summary>

The `SQL.Row["article"]` is the type for our `article` table. This is defined in `packages/core/src/sql.ts`.

```ts title="packages/core/src/sql.ts"
export type Row = {
  [Key in keyof Database]: Selectable<Database[Key]>;
};
```

Where the `Database[Key]` is coming from `packages/core/src/sql.generated.ts`, and each key is the type for each table.

The types in `packages/core/src/sql.generated.ts` are auto-generated when we run our migrations. We talked about this back in the [Write to the Database](write-to-the-database.md) chapter.

</details>

Let's add a new `Comment` type for our comments feature.

---

## Create a comment type

<ChangeText>

In `packages/functions/src/graphql/types/article.ts`, add the following above the `ArticleType`.

</ChangeText>

```ts title="packages/functions/src/graphql/types/article.ts"
const CommentType = builder.objectRef<SQL.Row["comment"]>("Comment").implement({
  fields: (t) => ({
    id: t.exposeID("commentID"),
    text: t.exposeString("text"),
  }),
});
```

This should be pretty straightforward. We are taking the `comment` type from our SQL query and exposing the `commentID` as type `ID` and the comment `text` as a `String`.

---

## Return the comments

Next, we want to return our comments as a part of an article. So let's edit the existing article type to add a resolver function to fetch the comments.

:::info
In _code-first_ GraphQL with Pothos, we define the resolvers and the schema together.
:::

A _resolver_ is a function that does an action; it either reads or writes some data. We'll look at this in detail in the next chapter.

<ChangeText>

Add a `comments` field to the `ArticleType` in `packages/functions/src/graphql/types/article.ts`.

</ChangeText>

```ts {6-9} title="packages/functions/src/graphql/types/article.ts"
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

Here we are:

- Using the `Comment` type from above and defining a resolver.
- The resolver function takes an `article` object.
- It grabs the `articleID` from it and calls the `Article.comments()` domain function in `packages/core/src/article.ts`. We implemented this back in the [Write to the Database](write-to-the-database.md) chapter.

---

Now that our types are defined, let's write the queries and mutations.
