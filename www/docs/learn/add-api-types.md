---
title: Add API Types
---

import ChangeText from "@site/src/components/ChangeText";

The GraphQL setup we are using is a _Code-first_ GraphQL setup. This means that we write our schema definitions in TypeScript instead of the [standard GraphQL schema](https://graphql.org/learn/schema/). This allows us to have strong typing along and minimal boilerplate code.

We use [Pothos](https://pothos-graphql.dev/) to do this. A key concept to understand here is that there are two different type systems involved:

1. The underlying types that we get from the database queries we make. More on this later.
2. The types that we need to define in our GraphQL schema.

In this chapter, we'll be using the types from our database to define the types in our GraphQL schema.

Let's start by creating a `Comment` type. Since the underlying types are coming from our database queries, this next step depends on the database and query builder you are using.

Let's start with RDS PostgreSQL.

## Create a Comment type

In the case of RDS, we are using [Kysely](https://koskimas.github.io/kysely/) to query our database.




In [Pothos](https://pothos-graphql.dev/) you can specify the types for the underlying resource that the GraphQL object is backed by. This will vary depending on which database you chose.

- **DynamoDB** `Article.CommentTypeEntity`
- **RDS** `SQL.Row["comment"]`

<ChangeText>

In `services/functions/graphql/types/article.ts`, add the following above the `ArticleType`.

</ChangeText>

```ts title="services/functions/graphql/types/article.ts"
const CommentType = builder.objectRef<SQL.Row["comment"]>("Comment").implement({
  fields: t => ({
    id: t.exposeString("commentID"),
    text: t.exposeString("text")
  })
});
```

Here our `CommentType` is exposing the fields from a row in the `comment` table. It's also defining the type for those fields.

## Update the Article type

We'll also add a `comments` field to the `ArticleType`. Replace the `ArticleType` with:

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

Now when the API returns an `Article` with `comments`, we'll call the `Article.comments()` function from the core package. It'll fetch the comments from the database, and return a list of comments, ie. `[CommentType]`.

Next, let's update our API to be able to add a new comment.
