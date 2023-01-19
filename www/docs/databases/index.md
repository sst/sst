---
title: Databases
---

Let's look at how to work with databases in your SST app.

## Database options

SST allows you to add different kinds of serverless databases to your app. Let's take a look at a couple of the options here.

### Aurora RDS

[Amazon Aurora RDS](https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/CHAP_AuroraOverview.html) is a relational database service offered by AWS. With traditional relational databases, you normally need to keep persistent connections to the database, and you have to ensure the number of open connections is within the limit the database can handle. Aurora offers a [Data API](https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/data-api.html). The Data API doesn't require a persistent connection. Instead, you can run SQL statements over HTTP API calls.

```js
import { RDS, Function } from "sst/constructs";

const DATABASE = "MyDatabase";

// Create the Aurora DB cluster
const cluster = new RDS(stack, "myDB", {
  engine: "postgresql11.13",
  defaultDatabaseName: DATABASE,
});

// Create a Function that will access the DB
new Function(stack, "myFunction", {
  handler: "src/lambda.main",
  bind: [cluster],
});
```

A couple of things to note here:

- The Aurora cluster is deployed into a VPC, but our Lambda functions don't need to be inside the VPC, since we are calling the Data API to send SQL statements.
- Aurora scales up and down automatically based on requests. When it is not in use, the database shuts down. And subsequent queries to the database takes around 5 seconds to start back up. You can configure [autoPause](constructs/RDS.md#autopause) to false to ensure the database never shuts down.
- Note that, if the cluster never shuts down, you will get charged (for the minimum capacity) even if the database is not being used. To save on costs, set [autoPause](constructs/RDS.md#autopause) to false just for production environments.

You can use the [SST Console](console.md) to manage the RDS clusters in your app.

![SST Console RDS tab](/img/console/sst-console-rds-tab.png)

You can use the query editor to run queries. You can also use the migrations panel to view all of your migrations and apply them.

Then use the [`data-api-client`](https://www.npmjs.com/package/data-api-client) to make queries to the database.

```js title="src/lambda.js"
import client from "data-api-client";
import { RDS } from "sst/node/rds";

const db = client({
  database: RDS.myDB.defaultDatabaseName,
  secretArn: RDS.myDB.secretArn,
  resourceArn: RDS.myDB.clusterArn,
});

export async function handler() {
  const results = await db.query(
    "SELECT * FROM tblNotes where noteId='note-id-456'"
  );
}
```

You can [read more about how Aurora works](https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/aurora-serverless.html).

:::tip Example

Check out this tutorial on using PostgreSQL and Aurora in your SST app.

[READ TUTORIAL](https://sst.dev/examples/how-to-use-postgresql-in-your-serverless-app.html)

:::

#### Data migrations

The `RDS` construct uses [Kysely](https://koskimas.github.io/kysely/) to run and manage schema migrations. You can point `migrations` to the folder where your migration files are.

On `sst deploy`, all migrations that have not yet been run will be run as a part of the deploy process. The migrations are executed in alphabetical order by their name.

On `sst dev`, migrations are not automatically run. You can use the [SST Console](console.md) to view all of your migrations and apply them.

```js
const cluster = new RDS(stack, "myDB", {
  engine: "postgresql11.13",
  defaultDatabaseName: DATABASE,
  migrations: "path/to/migrations",
});
```

Each migratione file has an `up` and a `down` function. For example, a migration file for PostgreSQL looks like this:

```js
async function up(db) {
  await db.schema
    .createTable("person")
    .addColumn("id", "serial", (col) => col.primaryKey())
    .addColumn("first_name", "varchar", (col) => col.notNull())
    .addColumn("last_name", "varchar")
    .addColumn("gender", "varchar(50)", (col) => col.notNull())
    .execute();
}

async function down(db) {
  await db.schema.dropTable("person").execute();
}

module.exports = { up, down };
```

### DynamoDB

The [`Table`](constructs/Table.md) construct allows you to use [DynamoDB](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Introduction.html) as your database. It enables you to create a fast and scalable NoSQL database that is a true serverless database, in that it scales instantly and is priced according to usage.

To add a DynamoDB table to your app:

```js
import { Table } from "sst/constructs";

// Create a Table
const table = new Table(stack, "notes", {
  fields: {
    userId: "string",
    noteId: "string",
  },
  primaryIndex: { partitionKey: "noteId", sortKey: "userId" },
});

// Create a Function that will access the Table
new Function(stack, "myFunction", {
  handler: "src/lambda.main",
  bind: [table],
});
```

You can use the [SST Console](console.md) to query the DynamoDB in your app.

![SST Console DynamoDB tab](/img/console/sst-console-dynamodb-tab.png)

And use AWS DynamoDB SDK to access the Table in your functions.

```js title="src/lambda.js"
import { Table } from "sst/node/table";
import AWS from "aws-sdk";
const DynamoDb = new AWS.DynamoDB.DocumentClient();

export async function main(event) {
  // Fetch the data
  const results = await DynamoDb.get({
    TableName: Table.notes.tableName,
    Key: {
      userId: "user-id-123",
      noteId: "note-id-456",
    },
  }).promise();

  // ...
}
```

:::tip Example

Here's a complete tutorial on how to add a DynamoDB table to your serverless app.

[READ TUTORIAL](https://sst.dev/examples/how-to-use-dynamodb-in-your-serverless-app.html)

:::

#### Subscribe to changes

DynamoDB Streams allows you to subscribe to changes in your tables in real time. You can subscribe with a Lambda function and take action based on the changes.

```js {8-10}
new Table(stack, "notes", {
  fields: {
    userId: "string",
    noteId: "string",
  },
  primaryIndex: { partitionKey: "noteId", sortKey: "userId" },
  stream: true,
  consumers: {
    consumer: "src/consumer.main",
  },
});
```

### MongoDB

Aside from AWS's serverless database offerings, there are a couple of other really good serverless database providers.

You can use [the new serverless instance of MongoDB Atlas](https://www.mongodb.com/atlas/database?utm_campaign=serverless_stack&utm_source=serverlessstack&utm_medium=website&utm_term=partner). It's a NoSQL database with a JSON-like document model.

:::tip Example

Follow this tutorial on how to use MongoDB Atlas and SST.

[READ TUTORIAL](https://sst.dev/examples/how-to-use-mongodb-in-your-serverless-app.html)

:::

<!---

#### PlanetScale

[PlanetScale](https://planetscale.com) is a MySQL-compatible serverless database.

:::tip Example (TODO)

Check out this tutorial on how to use PlanetScale as the database in your SST app.

[READ TUTORIAL](https://sst.dev/examples/how-to-use-planetscale-in-your-serverless-app.html)

:::
-->

## Seeding data

SST offers a simple way to seed data into your database using the [`Script`](constructs/Script.md) construct. The `onCreate` function is only run once when the construct is first deployed; allowing you to use it to seed the data into your database.

```js
new Script(stack, "Script", {
  defaults: {
    function: {
      bind: [table],
    },
  },
  onCreate: "src/seedDatabase.main",
});
```
