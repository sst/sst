---
description: "Docs for the sst.RDS construct in the @serverless-stack/resources package"
---
The `RDS` construct is a higher level CDK construct that makes it easy to create an [RDS Serverless Cluster](https://aws.amazon.com/rds/). It uses the following defaults:

- Defaults to using the [Serverless v1 On-Demand autoscaling configuration](https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/aurora-serverless.html) to make it serverless.
- Provides a built-in interface for running schema migrations using [Kysely](https://koskimas.github.io/kysely/#migrations).
- Enables [Data API](https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/data-api.html) to allow your Lambda functions to access the database cluster without needing to deploy the functions in a VPC (virtual private cloud).
- Enables [Backup Snapshot](https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/BackupRestoreAurora.html) to make sure that you don't lose your data.


## Constructor
```ts
new RDS(scope: Construct, id: string, props: RDSProps)
```
_Parameters_
- __scope__ [`Construct`](https://docs.aws.amazon.com/cdk/api/v2/docs/constructs.Construct.html)
- __id__ `string`
- __props__ [`RDSProps`](#rdsprops)
## Examples

### Using the minimal config

```js
import { RDS } from "@serverless-stack/resources";

new RDS(this, "Database", {
  engine: "postgresql10.14",
  defaultDatabaseName: "my_database",
});
```



### Configuring the RDS cluster

You can configure the internally created CDK `ServerlessCluster` instance.

```js {6-8}
import * as cdk from "aws-cdk-lib";

new RDS(this, "Database", {
  engine: "postgresql10.14",
  defaultDatabaseName: "acme",
  cdk: {
    cluster: {
      backupRetention: cdk.Duration.days(7),
    }
  },
});
```


### Import an existing VPC

The `RDS` construct automatically creates a VPC to deploy the cluster. This VPC contains only PRIVATE and ISOLATED subnets, without NAT Gateways.

:::note
Since we are using the Data API, you don't need to deploy your Lambda functions into the RDS's VPC.
:::

Yo can override the internally created `VPC` instance.

```js {7-12}
import * as ec2 from "aws-cdk-lib/aws-ec2";

new RDS(this, "Database", {
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
    }
  },
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

The `RDS` construct uses [Kysely](https://koskimas.github.io/kysely/) to run and manage schema migrations. The `migrations` prop should point to the folder where your migration files are.

On `sst deploy`, all migrations that have not yet been run will be run as a part of the deploy process. The migrations are executed in alphabetical order by their name.

On `sst start`, migrations are not automatically run. You can manually run them via the [SST Console](../console.md).

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

[Read more about writing migrations](https://koskimas.github.io/kysely/#migrations) over on the Kysely docs.



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


## Properties
An instance of `RDS` has the following properties.

### cdk.cluster

_Type_ : [`ServerlessCluster`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.ServerlessCluster.html)

The ARN of the internally created CDK ServerlessCluster instance.


### clusterArn

_Type_ : `string`

The ARN of the internally created CDK `ServerlessCluster` instance.

### clusterEndpoint

_Type_ : [`Endpoint`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.Endpoint.html)

The ARN of the internally created CDK ServerlessCluster instance.

### clusterIdentifier

_Type_ : `string`

The ARN of the internally created CDK ServerlessCluster instance.

### defaultDatabaseName

_Type_ : `string`

### migratorFunction

_Type_ : [`Function`](Function)

The ARN of the internally created CDK ServerlessCluster instance.

### secretArn

_Type_ : `string`

The ARN of the internally created CDK ServerlessCluster instance.

## RDSCdkServerlessClusterProps
### backupRetention

_Type_ : [`Duration`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.Duration.html)

The number of days during which automatic DB snapshots are retained.
Automatic backup retention cannot be disabled on serverless clusters.
Must be a value from 1 day to 35 days.

Duration.days(1)
stable

### clusterIdentifier

_Type_ : `string`

An optional identifier for the cluster.

- A name is automatically generated.
stable

### credentials

_Type_ : [`Credentials`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.Credentials.html)

Credentials for the administrative user.

- A username of 'admin' and SecretsManager-generated password
stable

### deletionProtection

_Type_ : `boolean`

Indicates whether the DB cluster should have deletion protection enabled.

- true if removalPolicy is RETAIN, false otherwise
stable

### enableDataApi

_Type_ : `boolean`

Whether to enable the Data API.

false
https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/data-api.html
stable

### parameterGroup

_Type_ : [`IParameterGroup`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.IParameterGroup.html)

Additional parameters to pass to the database engine.

- no parameter group.
stable

### removalPolicy

_Type_ : [`RemovalPolicy`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.RemovalPolicy.html)

The removal policy to apply when the cluster and its instances are removed from the stack or replaced during an update.

- RemovalPolicy.SNAPSHOT (remove the cluster and instances, but retain a snapshot of the data)
stable

### securityGroups

_Type_ : [`ISecurityGroup`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.ISecurityGroup.html)

Security group.

- a new security group is created.
stable

### storageEncryptionKey

_Type_ : [`IKey`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.IKey.html)

The KMS key for storage encryption.

- the default master key will be used for storage encryption
stable

### subnetGroup

_Type_ : [`ISubnetGroup`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.ISubnetGroup.html)

Existing subnet group for the cluster.

- a new subnet group will be created.
stable

### vpc

_Type_ : [`IVpc`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.IVpc.html)

### vpcSubnets

_Type_ : [`SubnetSelection`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.SubnetSelection.html)

Where to place the instances within the VPC.

- the VPC default strategy if not specified.
stable

## RDSProps

### cdk.cluster

_Type_ : [`RDSCdkServerlessClusterProps`](#rdscdkserverlessclusterprops)

Configure the internallly created RDS cluster


### defaultDatabaseName

_Type_ : `string`

Name of a database which is automatically created inside the cluster

### engine

_Type_ : `"mysql5.6"`&nbsp; | &nbsp;`"mysql5.7"`&nbsp; | &nbsp;`"postgresql10.14"`

Database engine of the cluster.

### migrations

_Type_ : `string`

Path to the directory that contains the migration scripts.

- Migrations not automatically run on deploy.

### scaling

_Type_ : [`RDSScalingProps`](#rdsscalingprops)

Scaling configuration of the cluster.

- The cluster is automatically paused after 5 minutes of being idle.
minimum capacity: 2 ACU
maximum capacity: 16 ACU

## RDSScalingProps
### autoPause

_Type_ : `number`&nbsp; | &nbsp;`boolean`

The time before the cluster is paused.
Pass in true to pause after 5 minutes of inactive. And pass in false to
disable pausing.

Or pass in the number of minutes to wait before the cluster is paused.

- true

### maxCapacity

_Type_ : `"ACU_1"`&nbsp; | &nbsp;`"ACU_2"`&nbsp; | &nbsp;`"ACU_4"`&nbsp; | &nbsp;`"ACU_8"`&nbsp; | &nbsp;`"ACU_16"`&nbsp; | &nbsp;`"ACU_32"`&nbsp; | &nbsp;`"ACU_64"`&nbsp; | &nbsp;`"ACU_128"`&nbsp; | &nbsp;`"ACU_192"`&nbsp; | &nbsp;`"ACU_256"`&nbsp; | &nbsp;`"ACU_384"`

The maximum capacity for the cluster.

- ACU_16

### minCapacity

_Type_ : `"ACU_1"`&nbsp; | &nbsp;`"ACU_2"`&nbsp; | &nbsp;`"ACU_4"`&nbsp; | &nbsp;`"ACU_8"`&nbsp; | &nbsp;`"ACU_16"`&nbsp; | &nbsp;`"ACU_32"`&nbsp; | &nbsp;`"ACU_64"`&nbsp; | &nbsp;`"ACU_128"`&nbsp; | &nbsp;`"ACU_192"`&nbsp; | &nbsp;`"ACU_256"`&nbsp; | &nbsp;`"ACU_384"`

The minimum capacity for the cluster.

- ACU_2
