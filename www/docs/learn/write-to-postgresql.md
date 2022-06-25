---
title: Write to PostgreSQL
---

Let's store our comments in our RDS PostgreSQL database. If you'd like to use DynamoDB instead, you can skip ahead to the next chapter.

We first need to create a new table to store our comments.

## Create a new migration

To do this, let's create a new migration.

Run from the root of the project.

```bash
npm run gen migration new
```

And enter `comment` for migration name.

```bash
? Migration name › comment
```

Once the migration is created, you should see the following printed out in the terminal.

```bash
✔ Migration name · comment

Loaded templates: _templates
       added: services/migrations/1656074109287_comment.mjs
```

Open up the created file `services/migrations/1656074109287_comment.mjs` and replace with the follow content.

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

We can then go ahead and run the migration.

Go to the RDS tab in SST Console and click **Apply** on the `second` migration.

![Console run migration](/img/implement-rds/run-migration.png)

To verify that the table has been created; enter `SELECT * FROM comment` in the query editor, and click **Execute**. You should see **0 rows** being returned.

![Console query comments table](/img/implement-rds/console-query-comment.png)

## Query the table

Now let's implement the `addComment` and `comments` functions that we created back in the [Scaffold Business Logic](scaffold-business-logic.md) chapter.

Open `services/core/article.ts` and replace the two placeholder functions with:

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

Now that that we can talk to the database; let's hook up our API.
