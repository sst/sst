---
title: Database 🟢
description: "How to create a database in your SST app"
---

SST offers a copule of ways to create a database. Depending on the use case, you can choose the one that fits the need.

## DynamoDB

The [Table](../constructs/Table.md) construct uses [DynamoDB](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Introduction.html) behind the scene. It enables you to create a fast and scalable NoSQL database.

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

And use AWS DynamoDB SDK to access the Table.

```js title="src/lambda.js"
import AWS from "aws-sdk";
const DynamoDb = new AWS.DynamoDB.DocumentClient();

export async function main(event) {
  // Fetch data
  const results = await DynamoDb.get({
    TableName: process.env.TABLE_NAME,
    Key: {
      userId: "user-id-123",
      noteId: "note-id-456",
    },
  }).promise();

  ...
}
```

:::info Example

This tutorial steps through using DynamoDB in a serverless API.

[READ TUTORIAL](https://serverless-stack.com/examples/how-to-use-dynamodb-in-your-serverless-app.html)

:::

### Subscribe to changes

DynamoDB Streams allow you to subscribe to changes in the table in real time. You can subscribe with a Lambda function and take action based on the changes.

```js
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

## Aurora RDS

[Amazon Aurora RDS](https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/CHAP_AuroraOverview.html) is a relational database service offered by AWS. With traditional relational databases, you normally need to keep persistent connections to the DB, and you have to ensure the number of open connections is within the limit the DB can handle. Aurora offers a Data API. The Data API doesn't require a persistent connection to the DB. Instead, you can run SQL statements over API calls.

```js
import { Duration } from "@aws-cdk/core";
import { Vpc } from "@aws-cdk/aws-ec2";
import { ServerlessCluster, DatabaseClusterEngine, ParameterGroup } from "@aws-cdk/aws-rds";
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
- Aurora scales up and down automatically based on requests. When it is not in use, the database shuts down. And subsequent query, the database takes ~5 seconds to start back up. We configured `autoPause` to 0 seconds to ensure the database never shuts down.
- If the cluster never shuts down, you will get charged (for the minimum capacity) even if the DB is not being used. To save cost, set `autoPause` to 0 seconds only for production environments.


And use [`data-api-client`](https://www.npmjs.com/package/data-api-client) to access the Table.

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

Read more about how Aurora works here: https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/aurora-serverless.html

:::info Example

This tutorial steps through using PostgreSQL and Aurora in a serverless API.

[READ TUTORIAL](https://serverless-stack.com/examples/how-to-use-postgresql-in-your-serverless-app.html)

:::

## Third-party DB provider

### MongoDB

We use MongoDB as a NoSQL database, while having your Lambda functions connect to it.

:::info Example (TODO)

This tutorial steps through building a backend using MongoDB and SST.

[READ TUTORIAL](https://serverless-stack.com/examples/how-to-use-mongodb-in-your-serverless-app.html)

:::


### PlanetScale

We use PlanetScale as a MySQL database, while having your Lambda functions connect to it.

:::info Example (TODO)

This tutorial steps through building a backend using PlanetScale and SST.

[READ TUTORIAL](https://serverless-stack.com/examples/how-to-use-planetscale-in-your-serverless-app.html)

:::

## Seeding data

SST offers a simple way to seed data into your database using the [Script](../constructs/Script.md) construct. The `onCreate` function is only run once when the Script construct is first deployed.

```js
new Script(this, "Script", {
  defaultFunctionProps: {
    environment: { tableName: table.tableName },
    permissions: [table],
  },
  onCreate: "src/seedDatabase.main",
});
```

## Data migration

You can also use the Script construct to run data migrations. The `onUpdate` function is run on every deployment.

```js
new Script(this, "Script", {
  defaultFunctionProps: {
    environment: { tableName: table.tableName },
    permissions: [table],
  },
  onUpdate: "src/runMigration.main",
});
```
