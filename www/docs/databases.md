---
title: Databases
description: "Add a serverless database to your SST app."
---

import config from "../config";
import HeadlineText from "@site/src/components/HeadlineText";

<HeadlineText>

Add a serverless database to your SST app.

</HeadlineText>

---

## Overview

There are a couple of different serverless database options. The easiest one to configure is [Amazon DynamoDB](https://aws.amazon.com/dynamodb/) — a highly-performant NoSQL serverless database.

We'll also look at the other serverless database options like — Amazon RDS, MongoDB, and PlanetScale.

---

#### Get started

Start by creating a new SST + Next.js app by running the following command in your terminal. We are using Next.js for this example but you can use your favorite frontend.

```bash
npx create-sst@latest --template standard/nextjs
```

Let's create a simple hit counter in our app.

---

## Add the table

Add a DynamoDB table to your stacks.

```ts title="stacks/Default.ts"
const table = new Table(stack, "counter", {
  fields: {
    counter: "string",
  },
  primaryIndex: { partitionKey: "counter" },
});
```

Our table is going to look something like this.

| counter | tally |
| ------- | ----- |
| hits    | 123   |

Make sure to import the [`Table`](constructs/Table.md) construct.

```diff title="stacks/Default.ts"
- import { StackContext, NextjsSite } from "sst/constructs";
+ import { Table, StackContext, NextjsSite } from "sst/constructs";
```

---

## Bind the table

After adding the bucket, bind your Next.js app to it.

```diff title="stacks/Default.ts"
const site = new NextjsSite(stack, "site", {
  path: "packages/web",
+ bind: [table],
});
```

This allows Next.js app to access the table.

---

## Read from the table

We'll start by reading from the table.

```ts title="functions/web/pages/index.ts" {5}
export async function getServerSideProps() {
  const db = DynamoDBDocumentClient.from(new DynamoDBClient({}));

  const get = new GetCommand({
    TableName: Table.counter.tableName,
    Key: {
      counter: "hits",
    },
  });
  const results = await db.send(get);
  let count = results.Item ? results.Item.tally : 0;

  return { props: { count } };
}
```

This queries our table and returns the count.

---

#### Add the imports

Import the required packages.

```ts title="functions/web/pages/index.ts"
import { Table } from "sst/node/table";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  GetCommand,
  UpdateCommand,
  DynamoDBDocumentClient,
} from "@aws-sdk/lib-dynamodb";
```

Make sure to install them as well.

```bash
npm install @aws-sdk/client-dynamodb @aws-sdk/lib-dynamodb
```

---

#### Display the counter

Let's show this on the page.

```tsx title="functions/web/pages/index.tsx"
export default function Home({ count }: { count: number }) {
  return (
    <main>
      <h1>This site has been visited {count} times.</h1>
    </main>
  );
}
```

Now if you refresh the page it'll display the counter.

---

## Write to the table

Add this before returning the count. It increments the count and stores it.

```ts title="functions/web/pages/index.ts"
export async function getServerSideProps() {
  // Read from the table...
  let count = results.Item ? results.Item.tally : 0;

  const update = new UpdateCommand({
    TableName: Table.counter.tableName,
    Key: {
      counter: "hits",
    },
    UpdateExpression: "SET tally = :count",
    ExpressionAttributeValues: {
      ":count": ++count,
    },
  });
  await db.send(update);

  return { props: { count } };
}
```

Now if you refresh the page it'll update the count!

---

## Using a client

DynamoDB can be a little tricky to design around. Common questions revolve around whether you should create tables like you do with SQL databases. The recommended way is to use a [Single-Table Design](https://www.alexdebrie.com/posts/dynamodb-single-table/).

To make this easier check out [**ElectroDB**](https://electrodb.dev/en/core-concepts/introduction/). And <a href={config.discord}>join the #electrodb channel on our Discord</a> if you have any questions.

---

## Seeding data

SST also makes it easy to seed data into your database using the [`Script`](constructs/Script.md) construct.

```ts title="stacks/Default.ts"
new Script(stack, "Script", {
  defaults: {
    function: {
      bind: [table],
    },
  },
  onCreate: "packages/functions/src/seed.handler",
});
```

The `onCreate` function is only run once when the construct is first deployed; allowing you to use it to seed the data into your database.

---

## Other options

There are a couple of other serverless database options aside from DynamoDB.

---

### RDS

[Amazon Aurora RDS](https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/CHAP_AuroraOverview.html) is a relational database service offered by AWS. You can use PostgreSQL and MySQL with it.

With traditional relational databases, you normally need to keep persistent connections to the database, and you have to ensure the number of open connections is within the limit the database can handle. Aurora offers a [Data API](https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/data-api.html). The Data API doesn't require a persistent connection. Instead, you can run SQL statements over HTTP API calls.

```ts
import { RDS } from "sst/constructs";

new RDS(stack, "db", {
  engine: "postgresql11.13",
  defaultDatabaseName: "MyDatabase",
});
```

Here we are using the [`RDS`](constructs/RDS.md) construct. It also supports [running migrations](constructs/RDS.md#migrations).

:::tip Tutorial
[Check out our tutorial](learn/index.md) on how to build an app powered by an RDS database.
:::

---

### MongoDB

Aside from AWS's serverless database offerings, there are a couple of other really good serverless database providers.

You can use [the new serverless instance of MongoDB Atlas](https://www.mongodb.com/atlas/database?utm_campaign=serverless_stack&utm_source=serverlessstack&utm_medium=website&utm_term=partner). It's a NoSQL database with a JSON-like document model.

:::tip Tutorial
[Check out this tutorial](https://sst.dev/examples/how-to-use-mongodb-in-your-serverless-app.html) on how to use MongoDB in your SST app.
:::

---

### PlanetScale

[PlanetScale](https://planetscale.com) is a MySQL-compatible serverless database. It comes with some great workflow features like branching, schema diffs, and more.

:::tip Tutorial
[Check out this tutorial](https://sst.dev/examples/how-to-use-planetscale-in-your-serverless-app.html) on how to use PlanetScale in your SST app.
:::

---

And that's it! You now know how to add a serverless database to your SST app!
