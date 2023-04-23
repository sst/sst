---
description: "Docs for the sst.RDS construct in the @serverless-stack/resources package. This construct creates an RDS Serverless Cluster with Data API enabled, and supports running database migrations."
---

:::caution
This is the SST v0.x Constructs doc. SST v1 is now released. If you are using v1, see the [v1 Constructs doc](/constructs). If you are looking to upgrade to v1, [check out the migration steps](/constructs/v0/migration).
:::

The `RDS` construct is a higher level CDK construct that makes it easy to create an [RDS Serverless Cluster](https://aws.amazon.com/rds/). It uses the following defaults:

- Defaults to using the [Serverless v1 On-Demand autoscaling configuration](https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/aurora-serverless.html) to make it serverless.
- Provides a built-in interface for running schema migrations using [Kysely](https://koskimas.github.io/kysely/#migrations).
- Enables [Data API](https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/data-api.html) to allow your Lambda functions to access the database cluster without needing to deploy the functions in a VPC (virtual private cloud).
- Enables [Backup Snapshot](https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/BackupRestoreAurora.html) to make sure that you don't lose your data.

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

### Configuring auto-scaling

RDS automatically scales the cluster size based on CPU utilization, connections, and available memory. An RDS with the MySQL engine can scale from 1 to 256 ACU (Aurora capacity unit). And an RDS with the PostgreSQL engine can scale from 2 to 384 ACU. You can specify the minimum and maximum range for the cluster. The default minimum and maximum capacity are 2 and 16 ACU.

You can also choose to pause your RDS cluster after a given amount of time with no activity. When the cluster is paused, you are charged only for the storage. If database connections are requested when a cluster is paused, the cluster automatically resumes. By default, the cluster auto-pauses after 5 minutes of inactivity.

For dev stages, it makes sense to pick a low capacity and auto-pause time. And disable it for production stages.

```js {4-13}
import * as cdk from "aws-cdk-lib";
import * as rds from "aws-cdk-lib/aws-rds";

const prodConfig = {
  autoPause: false,
  minCapacity: "ACU_8",
  maxCapacity: "ACU_64",
};
const devConfig = {
  autoPause: true,
  minCapacity: "ACU_2",
  maxCapacity: "ACU_2",
};

new RDS(this, "Database", {
  engine: "postgresql10.14",
  defaultDatabaseName: "acme",
  scaling: app.stage === "prod" ? prodConfig : devConfig,
});
```

[Read more](https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/aurora-serverless.how-it-works.html#aurora-serverless.how-it-works.auto-scaling) over on the RDS docs.

### Configuring migrations

```js
new RDS(this, "Database", {
  engine: "postgresql10.14",
  defaultDatabaseName: "acme",
  migrations: "path/to/migration/scripts",
});
```

The `RDS` construct uses [Kysely](https://kysely-org.github.io/kysely/) to run and manage schema migrations. The `migrations` prop should point to the folder where your migration files are.

On `sst deploy`, all migrations that have not yet been run will be run as a part of the deploy process. The migrations are executed in alphabetical order by their name.

On `sst start`, migrations are not automatically run. You can manually run them via the [SST Console](../../console.md).

:::note
New migrations must always have a name that comes alphabetically after the last executed migration.
:::

Migration files should have the following format.

```js
async function up(db) {
  // Migration code
}

async function down(db) {
  // Migration code
}

module.exports = { up, down };
```

For example:

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

[Read more about writing migrations](https://kysely-org.github.io/kysely/#migrations) over on the Kysely docs.

### Configuring the RDS cluster

You can configure the internally created CDK `ServerlessCluster` instance.

```js {6-8}
import * as cdk from "aws-cdk-lib";

new RDS(this, "Database", {
  engine: "postgresql10.14",
  defaultDatabaseName: "acme",
  rdsServerlessCluster: {
    backupRetention: cdk.Duration.days(7),
  },
});
```

### Import an existing VPC

The `RDS` construct automatically creates a VPC to deploy the cluster. This VPC contains only PRIVATE and ISOLATED subnets, without NAT Gateways.

:::note
Since we are using the Data API, you don't need to deploy your Lambda functions into the RDS's VPC.
:::

You can override the internally created `VPC` instance.

```js {7-12}
import * as ec2 from "aws-cdk-lib/aws-ec2";

new RDS(this, "Database", {
  engine: "postgresql10.14",
  defaultDatabaseName: "acme",
  rdsServerlessCluster: {  
    vpc: ec2.Vpc.fromLookup(this, "VPC", {
      vpcId: "vpc-xxxxxxxxxx",
    }),
    vpcSubnets: {
      subnetType: ec2.SubnetType.PRIVATE,
    },
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

Supported engine are `mysql5.6`, `mysql5.7`, and `postgresql10.14` and `postgresql11.13`.

### defaultDatabaseName

_Type_ : `string`

Name of a database that's automatically created inside the cluster.

### scaling?

_Type_ : [`RDSScalingProps`](#rdsscalingprops)

Scaling configuration of the cluster.

### migrations?

_Type_ : `string`, _defaults to migrations not automatically run on deploy_

Path to the directory that contains the migration scripts.

### rdsServerlessCluster?

_Type_ : `cdk.aws-rds.ServerlessCluster | RDSCdkServerlessClusterProps`, _defaults to_ `undefined`

Optionally pass in a CDK [`cdk.aws-rds.ServerlessCluster`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_rds.ServerlessCluster.html) instance or [`RDSCdkServerlessClusterProps`](#rdscdkserverlessclusterprops). This allows you to override the default settings this construct uses internally to create the cluster.

## RDSScalingProps

### autoPause?

_Type_ : `boolean | number`, _defaults to true_

The time before an RDS cluster is paused. Pass in `true` to pause after 5 minutes of inactivity. And pass in `false` to disable auto-pausing.

Or pass in the number of minutes to wait before the cluster is paused.

### minCapacity?

_Type_ : `string`, _defaults to ACU_2_

The minimum capacity for an RDS cluster. Supported capacity are `ACU_1`, `ACU_2`, `ACU_4`, `ACU_8`, `ACU_16`, `ACU_32`, `ACU_64`, `ACU_128`, `ACU_192`, `ACU_256`, and `ACU_384`

### maxCapacity?

_Type_ : `string`, _defaults to ACU_16_

The maximum capacity for an RDS cluster. Supported capacity are `ACU_1`, `ACU_2`, `ACU_4`, `ACU_8`, `ACU_16`, `ACU_32`, `ACU_64`, `ACU_128`, `ACU_192`, `ACU_256`, and `ACU_384`

## RDSCdkServerlessClusterProps

`RDSCdkServerlessClusterProps` extends [`cdk.aws-rds.ServerlessClusterProps`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_rds.ServerlessClusterProps.html) with the exception that the `vpc` field is optional, in which case a default VPC will be created. And the `engine`, `defaultDatabaseName`, and `scaling` fields are **not accepted**. The engine, the default database name, and the scaling options should be configured using the [`engine`](#engine), the [`defaultDatabaseName`](#defaultdatabasename), and the [`scaling`](#scaling) properties.

You can use `RDSCdkServerlessClusterProps` to configure all the other table properties.
