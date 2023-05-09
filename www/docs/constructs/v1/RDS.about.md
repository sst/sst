 The `RDS` construct is a higher level CDK construct that makes it easy to create an [RDS Serverless Cluster](https://aws.amazon.com/rds/). It uses the following defaults:
 
   - Defaults to using the [Serverless v1 On-Demand autoscaling configuration](https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/aurora-serverless.html) to make it serverless.
   - Provides a built-in interface for running schema migrations using [Kysely](https://kysely-org.github.io/kysely/#migrations).
   - Enables [Data API](https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/data-api.html) to allow your Lambda functions to access the database cluster without needing to deploy the functions in a VPC (virtual private cloud).
   - Enables [Backup Snapshot](https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/BackupRestoreAurora.html) to make sure that you don't lose your data.

## Migrations

The `RDS` construct uses [Kysely](https://kysely-org.github.io/kysely/) to run and manage schema migrations. The `migrations` prop should point to the folder where your migration files are.

```js
new RDS(stack, "Database", {
  engine: "postgresql11.13",
  defaultDatabaseName: "acme",
  migrations: "path/to/migration/scripts",
});
```

On `sst deploy`, all migrations that have not yet been run will be run as a part of the deploy process. The migrations are executed in alphabetical order by their name.

On `sst start`, migrations are not automatically run. You can manually run them via the [SST Console](/console.md).

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

[Read more about writing migrations](https://koskimas.github.io/kysely/#migrations) over on the Kysely docs.

### Migrations with PostgreSQL

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

### Migrations with MySQL

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

## Auto-scaling

RDS automatically scales the cluster size based on CPU utilization, connections, and available memory. An RDS with the MySQL engine can scale from 1 to 256 ACU (Aurora capacity unit). And an RDS with the PostgreSQL engine can scale from 2 to 384 ACU. You can specify the minimum and maximum range for the cluster. The default minimum and maximum capacity are 2 and 16 ACU.

You can also choose to pause your RDS cluster after a given amount of time with no activity. When the cluster is paused, you are charged only for the storage. If database connections are requested when a cluster is paused, the cluster automatically resumes. By default, the cluster auto-pauses after 5 minutes of inactivity.

For dev stages, it makes sense to pick a low capacity and auto-pause time. And disable it for production stages.

```js
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

new RDS(stack, "Database", {
  engine: "postgresql11.13",
  defaultDatabaseName: "acme",
  scaling: app.stage === "prod" ? prodConfig : devConfig,
});
```

[Read more](https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/aurora-serverless.how-it-works.html#aurora-serverless.how-it-works.auto-scaling) over on the RDS docs.

## Examples

### Using the minimal config

```js
import { RDS } from "@serverless-stack/resources";

new RDS(stack, "Database", {
  engine: "postgresql11.13",
  defaultDatabaseName: "my_database",
});
```

### Configuring the RDS cluster

You can configure the internally created CDK `ServerlessCluster` instance.

```js {7-9}
import * as cdk from "aws-cdk-lib";

new RDS(stack, "Database", {
  engine: "postgresql11.13",
  defaultDatabaseName: "acme",
  cdk: {
    cluster: {
      backupRetention: cdk.Duration.days(7),
    },
  },
});
```

### Advanced examples

#### Import existing RDS Serverless v1 cluster

```js {7-14}
import * as rds from "aws-cdk-lib/aws-rds";
import * as secretsManager from "aws-cdk-lib/aws-secretsmanager";

new RDS(stack, "Database", {
  engine: "postgresql11.13",
  defaultDatabaseName: "acme",
  cdk: {
    cluster: rds.ServerlessCluster.fromServerlessClusterAttributes(stack, "ICluster", {
      clusterIdentifier: "my-existing-cluster",
    }),
    secret: secretsManager.Secret.fromSecretAttributes(stack, "ISecret", {
      secretPartialArn: "arn:aws:secretsmanager:us-east-1:123456789012:secret:my-secret",
    }),
  },
});
```

Note that migrations are support for imported cluster. In order for migrations to work, make sure `engine` and `defaultDatabaseName` match the configuration of the imported cluster. You also need to import the secret credentials used by the cluster from the Secrets Manager.

#### Using existing VPC

The `RDS` construct automatically creates a VPC to deploy the cluster. This VPC contains only PRIVATE and ISOLATED subnets, without NAT Gateways.

:::note
Since we are using the Data API, you don't need to deploy your Lambda functions into the RDS's VPC.
:::

Yo can override the internally created `VPC` instance.

```js {7-14}
import * as ec2 from "aws-cdk-lib/aws-ec2";

new RDS(stack, "Database", {
  engine: "postgresql11.13",
  defaultDatabaseName: "acme",
  cdk: {
    cluster: {  
      vpc: ec2.Vpc.fromLookup(this, "VPC", {
        vpcId: "vpc-xxxxxxxxxx",
      }),
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE,
      },
    },
  },
});
```
