---
title: Database
description: "Learn how to add a serverless database like DynamoDB or RDS to your Serverless Stack (SST) app."
---

Let's look at how to work with databases in your SST app.

## Database options

SST allows you to add different kinds of serverless databases to your app. Let's take a look at a couple of the options here.

### DynamoDB

The [`Table`](constructs/Table.md) construct allows you to use [DynamoDB](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Introduction.html) as your database. It enables you to create a fast and scalable NoSQL database that is a true serverless database, in that it scales instantly and is priced according to usage.

To add a DynamoDB table to your app:

```js
import { Table, TableFieldType } from "@serverless-stack/resources";

// Create a Table
const table = new Table(this, "Notes", {
  fields: {
    userId: TableFieldType.STRING,
    noteId: TableFieldType.STRING,
  },
  primaryIndex: { partitionKey: "noteId", sortKey: "userId" },
});

// Create a Function that will access the Table
new Function(this, "Function", {
  handler: "src/lambda.main",
  environment: {
    TABLE_NAME: table.tableName,
  },
  permissions: [table],
});
```

And use AWS DynamoDB SDK to access the Table in your functions.

```js title="src/lambda.js"
import AWS from "aws-sdk";
const DynamoDb = new AWS.DynamoDB.DocumentClient();

export async function main(event) {
  // Fetch the data
  const results = await DynamoDb.get({
    TableName: process.env.TABLE_NAME,
    Key: {
      userId: "user-id-123",
      noteId: "note-id-456",
    },
  }).promise();

  // ...
}
```

:::info Example

Here's a complete tutorial on how to add a DynamoDB table to your serverless app.

[READ TUTORIAL](https://serverless-stack.com/examples/how-to-use-dynamodb-in-your-serverless-app.html)

:::

#### Subscribe to changes

DynamoDB Streams allows you to subscribe to changes in your tables in real time. You can subscribe with a Lambda function and take action based on the changes.

```js {8-10}
new Table(this, "Notes", {
  fields: {
    userId: TableFieldType.STRING,
    noteId: TableFieldType.STRING,
  },
  primaryIndex: { partitionKey: "noteId", sortKey: "userId" },
  stream: true,
  consumers: {
    consumer: "src/consumer.main",
  },
});
```

### Aurora RDS

[Amazon Aurora RDS](https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/CHAP_AuroraOverview.html) is a relational database service offered by AWS. With traditional relational databases, you normally need to keep persistent connections to the database, and you have to ensure the number of open connections is within the limit the database can handle. Aurora offers a [Data API](https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/data-api.html). The Data API doesn't require a persistent connection. Instead, you can run SQL statements over HTTP API calls.

```js
import { Duration } from "@aws-cdk/core";
import { Vpc } from "@aws-cdk/aws-ec2";
import {
  ParameterGroup, 
  ServerlessCluster,
  DatabaseClusterEngine,
} from "@aws-cdk/aws-rds";
import { Function } from "@serverless-stack/resources";

const DATABASE = "MyDatabase";

// Create the VPC needed for the Aurora DB cluster
const vpc = new Vpc(this, "VPC");

// Create the Aurora DB cluster
const cluster = new ServerlessCluster(this, "Cluster", {
  vpc,
  defaultDatabaseName: DATABASE,
  // Set the engine to Postgres
  engine: DatabaseClusterEngine.AURORA_POSTGRESQL,
  parameterGroup: ParameterGroup.fromParameterGroupName(
    this,
    "ParameterGroup",
    "default.aurora-postgresql10"
  ),
  // Optional, disable the instance from pausing after 5 minutes
  scaling: { autoPause: Duration.seconds(0) },
  // Enable Data Api
  enableDataApi: true,
});

// Create a Function that will access the DB
new Function(this, "Function", {
  handler: "src/lambda.main",
  environment: {
    DATABASE,
    CLUSTER_ARN: cluster.clusterArn,
    SECRET_ARN: cluster.secret.secretArn,
  },
  permissions: [cluster],
});
```

A couple of things to note here:

- The Aurora cluster is deployed into a VPC, but our Lambda functions don't need to be inside the VPC, since we are calling the Data API to send SQL statements.
- Aurora scales up and down automatically based on requests. When it is not in use, the database shuts down. And subsequent queries to the database takes around 5 seconds to start back up. We configured `autoPause` to 0 seconds to ensure the database never shuts down.
- Note that, if the cluster never shuts down, you will get charged (for the minimum capacity) even if the database is not being used. To save on costs, set `autoPause` to 0 seconds just for production environments.

Then use the [`data-api-client`](https://www.npmjs.com/package/data-api-client) to make queries to the database.

```js title="src/lambda.js"
import client from "data-api-client";

const db = client({
  database: process.env.DATABASE,
  secretArn: process.env.SECRET_ARN,
  resourceArn: process.env.CLUSTER_ARN,
});

export async function handler() {
  const results = await db.query(
    "SELECT * FROM tblNotes where noteId='note-id-456'"
  );
}
```

You can [read more about how Aurora works](https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/aurora-serverless.html).

:::info Example

Check out this tutorial on using PostgreSQL and Aurora in your SST app.

[READ TUTORIAL](https://serverless-stack.com/examples/how-to-use-postgresql-in-your-serverless-app.html)

:::

### MongoDB

Aside from AWS's serverless database offerings, there are a couple of other really good serverless database providers.

You can use [the new serverless instance of MongoDB Atlas](https://www.mongodb.com/atlas/database?utm_campaign=serverless_stack&utm_source=serverlessstack&utm_medium=website&utm_term=partner). It's a NoSQL database with a JSON-like document model.

:::info Example

Follow this tutorial on how to use MongoDB Atlas and SST.

[READ TUTORIAL](https://serverless-stack.com/examples/how-to-use-mongodb-in-your-serverless-app.html)

:::

<!---

#### PlanetScale

[PlanetScale](https://planetscale.com) is a MySQL-compatible serverless database.

:::info Example (TODO)

Check out this tutorial on how to use PlanetScale as the database in your SST app.

[READ TUTORIAL](https://serverless-stack.com/examples/how-to-use-planetscale-in-your-serverless-app.html)

:::
-->

## Seeding data

SST offers a simple way to seed data into your database using the [`Script`](constructs/Script.md) construct. The `onCreate` function is only run once when the construct is first deployed; allowing you to use it to seed the data into your database.

```js
new Script(this, "Script", {
  defaultFunctionProps: {
    environment: { tableName: table.tableName },
    permissions: [table],
  },
  onCreate: "src/seedDatabase.main",
});
```

## Data migrations

You can also use the [`Script`](constructs/Script.md) construct to run data migrations. The `onUpdate` function is run on every deployment.

```js
new Script(this, "Script", {
  defaultFunctionProps: {
    environment: { tableName: table.tableName },
    permissions: [table],
  },
  onUpdate: "src/runMigration.main",
});
```
