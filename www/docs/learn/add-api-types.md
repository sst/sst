---
title: Add API Types
---

import ChangeText from "@site/src/components/ChangeText";

The GraphQL setup we are using is a _Code-first_ GraphQL setup. This means that we write our schema definitions in TypeScript instead of the [standard GraphQL schema](https://graphql.org/learn/schema/). This allows us to have strong typing along and minimal boilerplate code.

We use [Pothos](https://pothos-graphql.dev/) to do this. A key concept to understand here is that there are two different types involved:

1. The underlying types that we get from the database queries we make. More on this later.
2. The types that we need to define in our GraphQL schema.

You can read more about this over on the [Pothos docs](https://pothos-graphql.dev/docs/guide/schema-builder#backing-models).

In this chapter, we'll be using the types from our database to define the types in our GraphQL schema.

Let's start by creating a `Comment` type.

## Create a Comment type

You'll recall that we are using [Kysely](https://koskimas.github.io/kysely/) to query our database and to run migrations. We use it to define the types for our tables.

:::info Behind the scenes
The `SQL.Row["comment"]` is the type for our `comment` table. This is defined in `services/core/sql.ts`.

``` ts title="services/core/sql.ts" {1}
export type Row = {
  [Key in keyof Database]: Selectable<Database[Key]>;
};
```

Where the `Database[Key]` is coming from `services/core/sql.generated.ts`, where each key is the type for each table.

```ts title="services/core/sql.generated.ts"
export interface Database {
 "article": article
 "comment": comment
 "kysely_migration": kysely_migration
 "kysely_migration_lock": kysely_migration_lock
}
```

Here's what the type for our `comment` table looks like. 

```ts title="services/core/sql.generated.ts"
export interface comment {
 'articleID': string;
 'commentID': string;
 'text': string;
}
```

The types in `services/core/sql.generated.ts` are auto-generated when we run our migrations. We talked about this back in the [Write to PostgreSQL](write-to-postgresql.md) chapter.
:::

Let's use this type to back our GraphQL schema.

<ChangeText>

In `services/functions/graphql/types/article.ts`, add the following above the `ArticleType`.

</ChangeText>

```ts title="services/functions/graphql/types/article.ts"
const CommentType = builder.objectRef<SQL.Row["comment"]>("Comment").implement({
  fields: t => ({
    id: t.exposeID("commentID"),
    text: t.exposeString("text")
  })
});
```

Let's look at what's going on here:

- The `builder` here is building our GraphQL schema. It's a Pothos [`SchemaBuilder`](https://pothos-graphql.dev/docs/guide/schema-builder) that we initialize in `services/functions/graphql/builder.ts`.
- We are using the `ObjectRef` way of defining a new type. You can read more about this over on the [pothos docs](https://pothos-graphql.dev/docs/guide/objects#using-refs).
- We are creating a new type called `Comment`.
- This is backed by the `SQL.Row["comment"]` database type from above.
- We pick the specific fields from that we want to expose, along with their types. These types, you might recall, are the GraphQL schema types.

:::info
We use the database types to define our GraphQL schema types in a _code-first_ approach.
:::

So in our case, we are exposing the `commentID` as an `ID` and the comment `text` as a `String`.

## Return the Comment type

We created this new `Comment` type because we want to return it as a part of the `Article`. So let's edit our `Article` type.

<ChangeText>

Add a `comments` field to the `ArticleType`. Replace it with:

</ChangeText>

```ts {6-9} title="services/functions/graphql/types/article.ts"
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

Here we are using the `Comment` type from above and defining how to `resolve` it. So given an `article`, we call `Article.comments()` from `services/core/article.ts`.

We added this back in the [Write to PostgreSQL](write-to-postgresql.md) chapter.

```ts
export async function comments(articleID: string) {
  return await SQL.DB.selectFrom("comment")
    .selectAll()
    .where("articleID", "=", articleID)
    .execute();
}
```

In this chapter we looked at how to define the type for our GraphQL schema using our auto-generated database types. And then we connected that to our query where we fetch the comments.

Next, we'll update our GraphQL schema to add a comment.
