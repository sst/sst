### Auto-scaling

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
  engine: "postgresql10.14",
  defaultDatabaseName: "acme",
  scaling: app.stage === "prod" ? prodConfig : devConfig,
});
```

[Read more](https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/aurora-serverless.how-it-works.html#aurora-serverless.how-it-works.auto-scaling) over on the RDS docs.

### Migrations

```js
new RDS(stack, "Database", {
  engine: "postgresql10.14",
  defaultDatabaseName: "acme",
  migrations: "path/to/migration/scripts",
});
```

The `RDS` construct uses [Kysely](https://koskimas.github.io/kysely/) to run and manage schema migrations. The `migrations` prop should point to the folder where your migration files are.

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

### Advanced examples

#### Configuring the RDS cluster

You can configure the internally created CDK `ServerlessCluster` instance.

```js {7-9}
import * as cdk from "aws-cdk-lib";

new RDS(stack, "Database", {
  engine: "postgresql10.14",
  defaultDatabaseName: "acme",
  cdk: {
    cluster: {
      backupRetention: cdk.Duration.days(7),
    },
  },
});
```

#### Import an existing VPC

The `RDS` construct automatically creates a VPC to deploy the cluster. This VPC contains only PRIVATE and ISOLATED subnets, without NAT Gateways.

:::note
Since we are using the Data API, you don't need to deploy your Lambda functions into the RDS's VPC.
:::

Yo can override the internally created `VPC` instance.

```js {7-14}
import * as ec2 from "aws-cdk-lib/aws-ec2";

new RDS(stack, "Database", {
  engine: "postgresql10.14",
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
