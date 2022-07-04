---
title: Write to DynamoDB
---

Skip this chapter if you are using RDS. If you have not created the list and create comments functions, go read [Scaffold Business Logic](scaffold-business-logic.md)

## Overview

DynamoDB is an excellent choice to use in serverless architectures. However, it is quite different than more familiar databases like Postgres and is best used with a pattern called [Single Table Design](https://www.alexdebrie.com/posts/dynamodb-single-table/).

The details of Single Table Design can be a bit of work to learn but `create-sst` ships with an excellent library called [ElectroDB](https://github.com/tywalch/electrodb) that provides a simplified way of following the pattern. While you should eventually dig deeper and learn the underlying patterns, ElectroDB helps you quickly get started and scales well to the most advanced patterns.

## Define Schema

In ElectroDB each concept in your data model is called an `Entity` and you can specify right in your application code. Let's start by creating a new Entity for comments in `services/core/article.ts`

```js
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
              composite: ["commentID"]
            },
            sk: {
              field: "sk",
              composite: [],
            }
          },
          byArticle: {
            index: "gsi1",
            pk: {
              field: "gsi1pk",
              composite: ["articleID"]
            },
            sk: {
              field: "gsi1sk",
              composite: ["commentID"],
            }
          }
        },
    },
    Dynamo.Configuration
)
```

This defines a new `CommentEntity` with the fields `articleID`, `commentID`, and `text`. `articleID` and `commentID` are marked `required` and `readOnly` (which means it cannot be changed after creation).

Additionally it uses the indexes defined in `stacks/Database.ts` to implement some useful functionality. The primary index, which is required, will allow querying this object by the `commentID` to retreive a single comment only knowing its `ID`.

The `byArticle` is a secondary index that allows fetching a list of comments only knowing the `articleID`. ElectroDB handles implementing these indexes through Single Table Design and you can learn more about this [here](https://github.com/tywalch/electrodb#indexes)

## Implementation

Now let's implement the `addComment` and `comments` functions that we created back in the [Scaffold Business Logic](scaffold-business-logic.md) chapter.

Open `services/core/article.ts` and replace the two placeholder functions with:

```js
export async function addComment(articleID: string, text: string) {
  return CommentEntity.create({
    articleID,
    commentID: ulid(),
    text,
  }).go()
}

export async function comments(articleID: string) {
  return CommentEntity.query.byArticle({
    articleID,
  }).go()
}
```
