---
title: Write to DynamoDB
---

If you've selected DynamoDB as your database of choice, this chapter will look at how to store our comments in DynamoDB.

If this is your first time using DynamoDB, it's quite different from relational databases like PostgreSQL or MySQL. It's best used with a pattern called Single Table Design.

### Single Table Design

[Single Table Design](https://www.alexdebrie.com/posts/dynamodb-single-table/) can be a bit of work to learn but `create sst` ships with an excellent library called [ElectroDB](https://github.com/tywalch/electrodb). It provides a simplified way of using the pattern.

:::info
ElectroDB helps us get started and use Single Table Design in DynamoDB.
:::

While you should eventually dig deeper and learn the underlying pattern, ElectroDB helps you quickly get started and scales well to the most advanced use cases.

### Define Schema

In ElectroDB each concept in your data model is called an `Entity` and you can specify right in your application code.

<ChangeText>

Let's start by creating a new Entity for comments in `services/core/article.ts`.

</ChangeText>

```js title="services/core/article.ts"
const CommentEntity = new Entity(
  {
    model: {
      version: "1",
      entity: "Comment",
      service: "myapp",
    },
    attributes: {
      commentID: {
        type: "string",
        required: true,
        readOnly: true,
      },
      articleID: {
        type: "string",
        required: true,
        readOnly: true,
      },
      text: {
        type: "string",
        required: true,
      },
    },
    indexes: {
      primary: {
        pk: {
          field: "pk",
          composite: ["commentID"],
        },
        sk: {
          field: "sk",
          composite: [],
        },
      },
      byArticle: {
        index: "gsi1",
        pk: {
          field: "gsi1pk",
          composite: ["articleID"],
        },
        sk: {
          field: "gsi1sk",
          composite: ["commentID"],
        },
      },
    },
  },
  Dynamo.Configuration
);
```

We are doing a couple of things here:

- We define a new `CommentEntity` with the fields `articleID`, `commentID`, and `text`. Where `articleID` and `commentID` are marked as `required` and `readOnly`. This means that it cannot be changed after creation.

  Additionally, it uses the indexes defined in `stacks/Database.ts` to implement some useful functionality. The primary index, which is required, will allow querying this object by the `commentID` to retreive a single comment given its `ID`.

- The `byArticle` is a secondary index that allows fetching a list of comments given the `articleID`. ElectroDB handles implementing these indexes through Single Table Design and you can [learn more about this here](https://github.com/tywalch/electrodb#indexes).

### Implementation

Now let's implement the `addComment` and `comments` functions that we created back in the Scaffold Business Logic chapter.

<ChangeText>

Replace the two placeholder functions in `services/core/article.ts` with:

</ChangeText>

```js title="services/core/article.ts" {2-6,10-12}
export async function addComment(articleID: string, text: string) {
  return CommentEntity.create({
    articleID,
    commentID: ulid(),
    text,
  }).go();
}

export async function comments(articleID: string) {
  return CommentEntity.query
    .byArticle({
      articleID,
    })
    .go();
}
```

Now with our business logic implemented, we are ready to hook up our API.
