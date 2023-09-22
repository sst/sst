---
title: Initialize the Database
---

import ChangeText from "@site/src/components/ChangeText";
import MultiPackagerCode from "@site/src/components/MultiPackagerCode";

Now let's check back in on the `sst dev` command that we started in the [Create a New Project](create-a-new-project.md) chapter.

Once your local development environment is up and running, you should see the following printed out in the terminal.

```
SST v2.5.5  ready!

➜  App:     my-sst-app
   Stage:   Jay
```

We are now ready to initialize our database. We are using RDS with PostgreSQL in this setup.

---

## RDS

[RDS](https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/aurora-serverless.html) is a fully-managed database offering from AWS. It supports PostgreSQL and MySQL engines.

SST provisions a serverless flavour of it with the [`RDS`](../constructs/RDS.md) construct. RDS will automatically scale up and down based on the load it's experiencing.

:::note
Serverless RDS can take a few minutes to autoscale up and down.
:::

We'll use RDS with PostgreSQL in this tutorial because it is the most familiar option. We'll do a deep dive into a true serverless database like [DynamoDB](https://aws.amazon.com/dynamodb/) at a later date. Since DynamoDB is a NoSQL database that requires you to model your data a little differently.

---

## Open the Console

<ChangeText>

Head over to the [Console](../console.md) link in your browser — [**old.console.sst.dev**](https://old.console.sst.dev/)

</ChangeText>

:::info
There's a new version of the SST Console ([console.sst.dev](https://console.sst.dev)). We'll be updating this tutorial soon. But for now let's use the older version.
:::

<ChangeText>

Then navigate to the **RDS** tab.

</ChangeText>

![Console RDS tab](/img/initialize-database/console-rds-tab.png)

:::tip
The Console needs a self-signed certificate to work with Safari or Brave. [Follow these steps to set it up](../console.md#safari--brave).
:::

At this point we don't have any tables in our database. To add them in, we are going to run a migration.

---

## What is a migration

Migrations are a set of files that contain the queries necessary to make updates to our database schema. They have an `up` function, that's run while applying the migration. And a `down` function, that's run while rolling back the migration.

Recall from the [Project Structure](project-structure.md) chapter that the migration files are placed in `packages/core/migrations/`.

The starter creates the first migration for you. It's called `article` and you'll find it in `packages/core/migrations/1650000012557_article.mjs`.

We use [Kysely](https://kysely-org.github.io/kysely/) to build our SQL queries in a typesafe way. We use that for our migrations as well.

```js title="packages/core/migrations/1650000012557_article.mjs"
import { Kysely } from "kysely";

/**
 * @param db {Kysely<any>}
 */
export async function up(db) {
  await db.schema
    .createTable("article")
    .addColumn("articleID", "text", (col) => col.primaryKey())
    .addColumn("title", "text", (col) => col.notNull())
    .addColumn("url", "text", (col) => col.notNull())
    .addColumn("created", "timestamp", (col) => col.defaultTo("now()"))
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

In this case, our migration is creating a table, called `article`, to store the links that are submitted. We are also adding an index to fetch them. The `down` function just removes the table and the index.

:::info
Migration files are named with a timestamp to prevent naming conflicts when you are working with your team.
:::

You can create a new migration from a template using a bash script. The script will ask for the name of a migration, then it'll generate a new file with the current timestamp.

<MultiPackagerCode>
<TabItem value="npm">

```bash
npm run gen migration new
````

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

We'll do this later in the tutorial. For now, let's apply our first migration.

---

## Run a migration

<ChangeText>

Click on the **Migrations** button on the top right, then click the **Apply** button on the **article** migration.

</ChangeText>

![Console apply migration](/img/initialize-database/console-apply-migration.png)

This'll create a table named `article`.

In the **Migrations** tab you'll see all the migrations in our app, and their status.

---

## Run a query

To verify that the table has been created successfully; enter the following query into the query editor, and hit **Execute**.

```sql
SELECT * FROM article
```

![Console query article](/img/initialize-database/console-query-article.png)

You should see the query returns **0 rows**.

<details>
<summary>Behind the scenes</summary>

Let's quickly recap what we've done so far:

1. We ran `sst dev` to start the [Live Lambda Dev](../live-lambda-development.md) environment and the [SST Console](../console.md).
2. Deployed the infrastructure for our app to AWS:
   - Including a RDS PostgreSQL database based on `stacks/Database.ts`.
3. We then opened up the Console and ran a migration in `packages/core/migrations/`.
4. The migration created an `article` table that we'll use to store the links our users will submit.
5. Finally, to test that everything is working, we queried our database.

</details>

:::tip
We'll be sprinkling in _**Behind the scenes**_ sections like the one above throughout this tutorial.

They are meant to be optional reading but can be really useful if you are trying to understand how things work behind the scenes.
:::

---

Next, let's look at the frontend.
