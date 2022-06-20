---
title: Using PostgreSQL
description: "Database Migrations of an SST app"
---

We are going to implement comments using PostgreSQL as our database. If you'd like to use DynamoDB instead, and we encourage you to try, you can skip ahead to the next chapter.

## Create a new migration

Create a new file at `api/migrations/second.mjs` with content:
```ts
import { Kysely } from "kysely";

/**
 * @param db {Kysely<any>}
 */
export async function up(db) {
  await db.schema
    .createTable("comment")
    .addColumn("commentID", "text", col => col.primaryKey())
    .addColumn("articleID", "text", col => col.notNull())
    .addColumn("text", "text", col => col.notNull())
    .execute();
}

/**
 * @param db {Kysely<any>}
 */
export async function down(db) {
  await db.schema.dropTable("comment").execute();
}
```

## Run migration

Go to the RDS tab in SST Console and `Apply` the `second` migration.

![](/img/implement-rds/run-migration.png)

Now let's verify the table has been created successfully. Enter `SELECT * FROM comment` into the query editor, and select `Execute`. You should see `0 rows` being returned.

![](/img/implement-rds/console-query-comment.png)

## Interact with Database

Now let's implement the `addComment` and `comments` functions created in the [Adding Comments to Article](add-article-comments).

Open up `api/core/article.ts` and replace the two functions with

```ts
export async function addComment(articleID: string, text: string) {
  return await SQL.DB.insertInto("comment")
    .values({
      commentID: ulid(),
      articleID,
      text,
    })
    .returningAll()
    .executeTakeFirstOrThrow();
}

export async function comments(articleID: string) {
  return await SQL.DB.selectFrom("comment")
    .selectAll()
    .where("articleID", "=", articleID)
    .execute();
}
```

We now can talk to the database. Next, let's hook up our API.