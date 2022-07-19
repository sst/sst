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

Here we are using [Kysely](https://koskimas.github.io/kysely/) to run queries against our database.

:::info Behind the scenes
There are a couple of interesting details here, let's dig in:

1. `SQL.DB` is the Kysely instance from `services/core/sql.ts`.

   ``` ts title="services/core/sql.ts" {1}
   export const DB = new Kysely<Database>({
     dialect: new DataApiDialect({
       mode: "postgres",
       driver: {
         secretArn: process.env.RDS_SECRET_ARN!,
         resourceArn: process.env.RDS_ARN!,
         database: process.env.RDS_DATABASE!,
         client: new RDSDataService(),
       },
     }),
   });
   ```

2. You might recall us setting the `process.env.` values back in the [Project Structure](project-structure.md#stacks) chapter. You can check the `stacks/Api.ts` for this.

   ```ts title="stacks/Api.ts" {4-6}
   function: {
     permissions: [db],
     environment: {
       RDS_SECRET_ARN: db.secretArn,
       RDS_ARN: db.clusterArn,
       RDS_DATABASE: db.defaultDatabaseName,
     },
   }
   ```

3. The Kysely instance needs a `Database` type. This is coming from `services/core/sql.generated.ts`.

   ```ts title="services/core/sql.generated.ts"
   export interface Database {
     "article": article
     "comment": comment
     "kysely_migration": kysely_migration
     "kysely_migration_lock": kysely_migration_lock
   }
   ```

   The keys of this interface are the table names in our database. And they in turn point to other interfaces that list the column types of the respective tables. For example, here's the new `comment` table we just created:

   ```ts
   export interface comment {
     'articleID': string;
     'commentID': string;
     'text': string;
   }
   ```

4. The `sql.generated.ts` file, as you might've guessed in generated. Our infrastructure code auto-generates this when a new migration is run!

   We defined this back in `stacks/Database.ts`.

   ```ts title="stacks/Database.ts" {4}
   const rds = new RDS(stack, "rds", {
     engine: "postgresql10.14",
     migrations: "services/migrations",
     types: "services/core/sql.generated.ts",
     defaultDatabaseName: "main",
   });
   ```
   Even though this file is generated, you should check it into Git. We'll be relying on it in later on in this tutorial.
:::

Now with our business logic and database queries implemented, we are ready to hook up our API.
