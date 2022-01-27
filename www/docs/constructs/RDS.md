---
description: "Docs for the sst.RDS construct in the @serverless-stack/resources package. This construct creates a RDS Serverless Cluster with Data API enabled, and runs database migrations."
---

The `RDS` construct is a higher level CDK construct that makes it easy to create a [RDS](https://aws.amazon.com/rds/) Serverless Cluster. It uses the following defaults:

- Defaults to using the [Serverless v1 On-Demand autoscaling configuration](https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/aurora-serverless.html) to make it perfectly serverless.
- Enables [Backup Snapshot](https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/BackupRestoreAurora.html) to make sure that you don't lose your data.
- Provides a built-in interface for running schema migrations using [Kysely](https://koskimas.github.io/kysely/#migrations).

## Initializer

```ts
new RDS(scope: Construct, id: string, props: RDSProps)
```

_Parameters_

- scope [`Construct`](https://docs.aws.amazon.com/cdk/api/v2/docs/constructs.Construct.html)
- id `string`
- props [`RDSProps`](#rdsprops)

## Examples

### Using the minimal config

```js
import { RDS } from "@serverless-stack/resources";

new RDS(this, "Database", {
  engine: "postgresql10.14",
  defaultDatabaseName: "my_database",
});
```

### Configuring migrations

```js
new RDS(this, "Database", {
  engine: "postgresql10.14",
  defaultDatabaseName: "acme",
  migrations: "path/to/migration/scripts",
});
```

[Kysely](https://koskimas.github.io/kysely/) is used to run and manage schema migrations. The `migrations` field should point to the folder where your migration files are.

On `sst deploy`, all migrations that have not yet been run will be run as a part of the deploy process. The migrations are executed in the alphhabetical order by their name.

On `sst start`, migrations are not automtically run. You can manually run them via the SST Console.

:::note
New migrations must always have a name that comes alphabetically after the last executed migration.
:::

Migration files should look like this:

```js
async function up(db) {
  // Migration code
}

async function down(db) {
  // Migration code
}

module.exports = { up, down };
```

#### PostgreSQL migration example

```js
async function up(db) {
  await db.schema
    .createTable("person")
    .addColumn("id", "serial", (col) => col.primaryKey())
    .addColumn("first_name", "varchar", (col) => col.notNull())
    .addColumn("last_name", "varchar")
    .addColumn("gender", "varchar(50)", (col) => col.notNull())
    .execute()
}

async function down(db) {
  await db.schema.dropTable("person").execute()
}

module.exports = { up, down };
```

#### MySQL migration example

```js
async function up(db) {
  await db.schema
    .createTable("person")
    .addColumn("id", "integer", (col) => col.autoIncrement().primaryKey())
    .addColumn("first_name", "varchar(255)", (col) => col.notNull())
    .addColumn("last_name", "varchar(255)")
    .addColumn("gender", "varchar(50)", (col) => col.notNull())
    .execute()
}

async function down(db) {
  await db.schema.dropTable("person").execute()
}

module.exports = { up, down };
```

[Read more](https://koskimas.github.io/kysely/#migrations) over on the Kysely docs.

### Configuring the RDS cluster

Configure the internally created CDK `ServerlessCluster` instance.

```js {9-11}
import { Duration } from "aws-cdk-lib";

new RDS(this, "Database", {
  engine: "postgresql10.14",
  defaultDatabaseName: "acme",
  rdsServerlessCluster: {
    backupRetention: Duration.days(7),
  },
});
```

## Properties

An instance of `RDS` contains the following properties.

### clusterArn

_Type_: `string`

The ARN of the internally created CDK `ServerlessCluster` instance.

### clusterIdentifier

_Type_: `string`

The identifier of the internally created CDK `ServerlessCluster` instance.

### clusterEndpoint

_Type_: `string`

The endpoint of the internally created CDK `ServerlessCluster` instance.

### secretArn

_Type_: `string`

The ARN of the internally created CDK `Secret` instance.

### migratorFunction

_Type_ : [`Function`](Function.md)

The internally created schema migration `Function` instance.

### rdsServerlessCluster

_Type_ : [`cdk.aws-rds.ServerlessCluster`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_rds.ServerlessCluster.html)

The internally created CDK `ServerlessCluster` instance.

## RDSProps

### engine

_Type_ : `string`

Supported engine are `mysql5.6`, `mysql5.7`, and `postgresql10.14`.

### defaultDatabaseName

_Type_ : `string`

Name of a database which is automatically created inside the cluster.

### migrations?

_Type_ : `string`, _defaults to migrations not automatically run on deploy_

Path to the directory that contains the migration scripts.

### rdsServerlessCluster?

_Type_ : `cdk.aws-rds.ServerlessCluster | RDSCdkServerlessClusterProps`, _defaults to_ `undefined`

Optionally pass in a CDK [`cdk.aws-rds.ServerlessCluster`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_rds.ServerlessCluster.html) instance or [`RDSCdkServerlessClusterProps`](#rdscdkserverlessclusterprops). This allows you to override the default settings this construct uses internally to create the cluster.

## RDSCdkServerlessClusterProps

`RDSCdkServerlessClusterProps` extends [`cdk.aws-rds.ServerlessClusterProps`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_rds.ServerlessClusterProps.html) with the exception that the `vpc` field is optional, in which case a default VPC will be created. And the `engine` and `defaultDatabaseName` fields are **not accepted**. The engine and the default database name should be configured using the [`engine`](#engine) and the [`defaultDatabaseName](#defaultdatabasename) field.

You can use `RDSCdkServerlessClusterProps` to configure all the other table properties.
