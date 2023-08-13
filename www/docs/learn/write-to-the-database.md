---
title: Write to the Database
---

import ChangeText from "@site/src/components/ChangeText";
import MultiPackagerCode from "@site/src/components/MultiPackagerCode";

We are ready to add our new comments feature.

---

## Scaffold business logic

We'll start by scaffolding the domain code first. As mentioned in the [last chapter](domain-driven-design.md), we'll add this to our `core` package.

<ChangeText>

Open up `packages/core/src/article.ts` and add the following two functions to the bottom of the file.

</ChangeText>

```js
export function addComment(articleID: string, text: string) {
  // code for adding a comment to an article
}

export function comments(articleID: string) {
  // code for getting a list of comments of an article
}
```

Before we can implement them, we'll need to create a new table to store the comments.

---

## Create a migration

Let's create a new migration for this.

<ChangeText>

Run this in the **root of the project** to create a new migration

</ChangeText>

<MultiPackagerCode>
<TabItem value="npm">

```bash
npm run gen migration new
```
</TabItem>
<TabItem value="yarn">

```bash
yarn run gen migration new
```

</TabItem>
<TabItem value="pnpm">

```bash
pnpm run gen migration new
```

</TabItem>
</MultiPackagerCode>


<ChangeText>

It'll ask you to name your migration. Type in **`comment`**.

</ChangeText>

```bash
? Migration name › comment
```

Once the migration is created, you should see the following in your terminal.

```bash
✔ Migration name · comment

Loaded templates: _templates
       added: packages/core/migrations/1661988563371_comment.mjs
```

<ChangeText>

Open up the new migration script and replace its content with:

</ChangeText>

```ts title="packages/core/migrations/1661988563371_comment.mjs"
import { Kysely } from "kysely";

/**
 * @param db {Kysely<any>}
 */
export async function up(db) {
  await db.schema
    .createTable("comment")
    .addColumn("commentID", "text", (col) => col.primaryKey())
    .addColumn("articleID", "text", (col) => col.notNull())
    .addColumn("text", "text", (col) => col.notNull())
    .execute();
}

/**
 * @param db {Kysely<any>}
 */
export async function down(db) {
  await db.schema.dropTable("comment").execute();
}
```

This migration will create a new table called `comment`. While undoing the migration will drop the table.

---

## Run a migration

Let's go ahead and run the migration.

<ChangeText>

Go to the RDS tab in SST Console and click **Apply** on our `comment` migration.

</ChangeText>

![Console run migration](/img/implement-rds/run-migration.png)

To verify that the table has been created; enter the following in the query editor, and hit **Execute**.

```sql
SELECT * FROM comment
```

![Console query comments table](/img/implement-rds/console-query-comment.png)

You should see **0 rows** being returned.

---

## Query the table

We are now ready to implement the `addComment` and `comments` functions.

<ChangeText>

Replace the two placeholder functions in `packages/core/src/article.ts` with:

</ChangeText>

```ts {2-9,13-16} title="packages/core/src/article.ts"
export function addComment(articleID: string, text: string) {
  return SQL.DB.insertInto("comment")
    .values({
      commentID: ulid(),
      articleID,
      text,
    })
    .returningAll()
    .executeTakeFirstOrThrow();
}

export function comments(articleID: string) {
  return SQL.DB.selectFrom("comment")
    .selectAll()
    .where("articleID", "=", articleID)
    .execute();
}
```

We are using [Kysely](https://kysely-org.github.io/kysely/) to run typesafe queries against our database.

<details>
<summary>Behind the scenes</summary>

There are a couple of interesting details here, let's dig in:

1. `SQL.DB` is the Kysely instance imported from `packages/core/src/sql.ts`.

   ```ts title="packages/core/src/sql.ts"
   export const DB = new Kysely<Database>({
     dialect: new DataApiDialect({
       mode: "postgres",
       driver: {
         secretArn: RDS.db.secretArn,
         resourceArn: RDS.db.clusterArn,
         database: RDS.db.defaultDatabaseName,
         client: new RDSDataService(),
       },
     }),
   });
   ```

2. `RDS` is coming from the SST Node client package.

   ```ts title="packages/core/src/sql.ts"
   import { RDS } from "sst/node/rds";
   ```

   It has access to the config of our database, thanks to [Resource Binding](../resource-binding.md). You might recall us **binding** our database to the functions in our API back in the [Project Structure](project-structure.md#stacks) chapter.

   ```ts title="stacks/Api.ts" {2}
   function: {
     bind: [rds],
   },
   ```

   By binding the `rds` cluster to our API in `stacks/Api.ts`, our API can access the database ARN (an ARN is an AWS identifier), database name, and ARN of the secret to access the database in our functions.

3. The Kysely instance also needs a `Database` type. This is coming from `packages/core/src/sql.generated.ts`.

   ```ts title="packages/core/src/sql.generated.ts"
   export interface Database {
     article: Article;
     comment: Comment;
   }
   ```

   The keys of this interface are the table names in our database. And they in turn point to other interfaces that list the column types of the respective tables. For example, here's the new `Comment` table we just created:

   ```ts
   export interface Comment {
     articleID: string;
     commentID: string;
     text: string;
   }
   ```

4. The `sql.generated.ts` types file, as you might've guessed in auto-generated. Our infrastructure code generates this when a new migration is run!

   It's defined in `stacks/Database.ts`.

   ```ts title="stacks/Database.ts" {4}
   const rds = new RDS(stack, "rds", {
     engine: "postgresql11.13",
     migrations: "packages/core/migrations",
     types: "packages/core/src/sql.generated.ts",
     defaultDatabaseName: "main",
   });
   ```

   Even though this file is auto-generated, you should check it into Git. We'll be relying on it later on in this tutorial.

</details>

---

Now with our business logic and database queries implemented, we are ready to hook up our API.
