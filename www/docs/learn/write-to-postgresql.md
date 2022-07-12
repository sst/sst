---
title: Write to PostgreSQL
---

import ChangeText from "@site/src/components/ChangeText";

So you've decided you want to work with RDS PostgreSQL. Let's get started with storing our comments in our database.

To do that we'll first create a new table for them.

### Create a new migration

We are going to create a new migration to make changes to our database.

<ChangeText>

Run this in the root of the project to create a new migration

</ChangeText>

```bash
npm run gen migration new
```

<ChangeText>

It'll ask you to name your migration. Type in `comment`.

</ChangeText>

```bash
? Migration name › comment
```

Once the migration is created, you should see the following in your terminal.

```bash
✔ Migration name · comment

Loaded templates: _templates
       added: services/migrations/1656074109287_comment.mjs
```

<ChangeText>

Open up the new migration and replace its content with:

</ChangeText>

```ts title="services/migrations/1656074109287_comment.mjs"
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

Applying this migration will create a  new table called `comment`. While undoing it will drop the table.

### Run migration

Let's go ahead and run the migration.

<ChangeText>

Go to the RDS tab in SST Console and click **Apply** on our `comment` migration.

</ChangeText>

![Console run migration](/img/implement-rds/run-migration.png)

Let's verify that the table has been created. Enter the following  in the query editor, and hit **Execute**.

``` sql
SELECT * FROM comment
```

![Console query comments table](/img/implement-rds/console-query-comment.png)

You should see **0 rows** being returned.

### Query the table

We are now ready to implement the `addComment` and `comments` functions that we created back in the [Scaffold Business Logic](scaffold-business-logic.md) chapter.

<ChangeText>

Replace the two placeholder functions in `services/core/article.ts` with:

</ChangeText>

```ts {2-9,13-16} title="services/core/article.ts"
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

Now with our business logic implemented, we are ready to hook up our API.
