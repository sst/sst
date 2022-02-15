---
description: "Docs for the sst.RDS construct in the @serverless-stack/resources package. This construct creates a RDS Serverless Cluster with Data API enabled, and runs database migrations."
---

The `RDS` construct is a higher level CDK construct that makes it easy to create a [RDS](https://aws.amazon.com/rds/) Serverless Cluster. It uses the following defaults:

- Defaults to using the [Serverless v1 On-Demand autoscaling configuration](https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/aurora-serverless.html) to make it perfectly serverless.
- Provides a built-in interface for running schema migrations using [Kysely](https://koskimas.github.io/kysely/#migrations).
- Enables [Data API](https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/data-api.html) to allow your Lambda functions access the database cluster without needing to deploy the funcitons in a virtual private cloud (VPC).
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

RDS automatically scales the cluster size based on CPU utilization, connections, and available memory. An RDS with MySQL engine can scale from 1 to 256 ACU (Aurora capacity unit). And an RDS with PostgreSQL engine can scale from 2 to 384 ACU. You can specifiy the minimum and maximum range for the cluster. The default minimum and maximum capacity are 2 and 16 ACU.

You can also choose to pause your RDS cluster after a given amount of time with no activity. When the cluster is paused, you are charged only for the storage. If database connections are requested when a cluster is paused, the cluster automatically resumes. By default, cluster auto pauses after 5 minutes of inactive.

To reduce cost, it makes sense to pick a low capacity and auto pause time for the development stages. And disable pausing for the production stages.

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

RDS automatically creates a VPC for the RDS cluster to be deployed into. This VPC contains only PRIVATE and ISOLATED subnets, without NAT Gateways.

:::note
Do not deploy your Lambda functions into RDS's VPC as the functions will talk to the RDS database via the Data API.
:::

Override the internally created `VPC` instance.

```js {5}
import * as ec2 from "aws-cdk-lib/aws-ec2";

new RDS(this, "Database", {
  engine: "postgresql10.14",
  defaultDatabaseName: "acme",
  vpc: ec2.Vpc.fromLookup(this, "VPC", {
    vpcId: "vpc-xxxxxxxxxx",
  }),
  vpcSubnets: {
    subnetType: ec2.SubnetType.PRIVATE,
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

The time before an RDS cluster is paused. Pass in `true` to pause after 5 minutes of inactive. And pass in `false` to disable pausing.

Or pass in the number of minutes to wait before the cluster is paused.

### minCapacity?

_Type_ : `string`, _defaults to ACU_2_

The minimum capacity for an RDS cluster. Supported capacity are `ACU_1`, `ACU_2`, `ACU_4`, `ACU_8`, `ACU_16`, `ACU_32`, `ACU_64`, `ACU_128`, `ACU_192`, `ACU_256`, and `ACU_384`

Name of a database which is automatically created inside the cluster.

### maxCapacity?

_Type_ : `string`, _defaults to ACU_16_

The maximum capacity for an RDS cluster. Supported capacity are `ACU_1`, `ACU_2`, `ACU_4`, `ACU_8`, `ACU_16`, `ACU_32`, `ACU_64`, `ACU_128`, `ACU_192`, `ACU_256`, and `ACU_384`

Name of a database which is automatically created inside the cluster.

## RDSCdkServerlessClusterProps

`RDSCdkServerlessClusterProps` extends [`cdk.aws-rds.ServerlessClusterProps`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_rds.ServerlessClusterProps.html) with the exception that the `vpc` field is optional, in which case a default VPC will be created. And the `engine`, `defaultDatabaseName`, and `scaling` fields are **not accepted**. The engine, the default database name, and the scaling options should be configured using the [`engine`](#engine), the [`defaultDatabaseName`](#defaultdatabasename), and the [`scaling`](#scaling) field.

You can use `RDSCdkServerlessClusterProps` to configure all the other table properties.
