---
title: Initialize the Database
---

import ChangeText from "@site/src/components/ChangeText";

Now let's check back in on the `sst start` command that we ran back in the [Create a New Project](create-a-new-project.md) chapter.

Once your local development environment is up and running, you should see the following printed out in the terminal.

```bash
==========================
Starting Live Lambda Dev
==========================

SST Console: https://console.sst.dev/my-sst-app/frank/local
Debug session started. Listening for requests...
```

Head over to the [SST Console](../console.md) link: `https://console.sst.dev/my-sst-app/frank/local` in the browser, and select the **RDS** explorer.

![Console RDS tab](/img/initialize-database/console-rds-tab.png)

### Migrations

Here's you'll see all the migrations that are available in our app. Recall from the [Project Structure](project-structure.md) chapter that all our database migrations are placed in `services/migrations`.

You can create a new migration by running `npm run gen migration new`. This command will ask for the name of a migration and it'll generate a new file with the current timestamp.

By default we have the first migration for you, called `article`. You'll find a `services/migrations/1650000012557_article.mjs` file.

We use [Kysely](https://koskimas.github.io/kysely/) to build our SQL queries in a type-safe way. We use that for our migrations as well.

```js title="services/migrations/1650000012557_article.mjs"
import { Kysely } from "kysely";

/**
 * @param db {Kysely<any>}
 */
export async function up(db) {
  await db.schema
    .createTable("article")
    .addColumn("articleID", "text", col => col.primaryKey())
    .addColumn("title", "text", col => col.notNull())
    .addColumn("url", "text", col => col.notNull())
    .addColumn("created", "timestamp", col => col.defaultTo("now()"))
    .execute();

  await db.schema
    .createIndex("idx_article_created")
    .on("article")
    .column("created")
    .execute();
}

/**
 * @param db {Kysely<any>}
 */
export async function down(db) {
  await db.schema.dropIndex("idx_article_created").execute();
  await db.schema.dropTable("article").execute();
}
```

Our migrations have an `up` function, this is run when applying the migration. While the `down` function is called while rolling back the migration.

In this case, our migration is creating a table (called `article`) to store our links and adding an index to it. The `down` function just removes them.

### Run a migration

<ChangeText>

Hit the **Migrations** button on the right, and apply the **article** migration.

</ChangeText>

![Console apply migration](/img/initialize-database/console-apply-migration.png)

This'll create a table named **article**. It stores all the links that've been submitted to our app.

### Run a query

To verify that the table has been created successfully; enter the following query into the query editor, and hit **Execute**.

```sql
SELECT * FROM article
```

![Console query article](/img/initialize-database/console-query-article.png)

You should see the query returns **0 rows**.

Next, let's start up our frontend locally.
