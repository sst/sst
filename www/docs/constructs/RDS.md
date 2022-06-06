---
description: "Docs for the sst.RDS construct in the @serverless-stack/resources package"
---
<!--
!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
!!                                                           !!
!!  This file has been automatically generated, do not edit  !!
!!                                                           !!
!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
-->
The `RDS` construct is a higher level CDK construct that makes it easy to create an [RDS Serverless Cluster](https://aws.amazon.com/rds/). It uses the following defaults:

- Defaults to using the [Serverless v1 On-Demand autoscaling configuration](https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/aurora-serverless.html) to make it serverless.
- Provides a built-in interface for running schema migrations using [Kysely](https://koskimas.github.io/kysely/#migrations).
- Enables [Data API](https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/data-api.html) to allow your Lambda functions to access the database cluster without needing to deploy the functions in a VPC (virtual private cloud).
- Enables [Backup Snapshot](https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/BackupRestoreAurora.html) to make sure that you don't lose your data.


## Constructor
```ts
new RDS(scope, id, props)
```
_Parameters_
- __scope__ <span class="mono">[Construct](https://docs.aws.amazon.com/cdk/api/v2/docs/constructs.Construct.html)</span>
- __id__ <span class="mono">string</span>
- __props__ <span class="mono">[RDSProps](#rdsprops)</span>

## Examples

### Using the minimal config

```js
import { RDS } from "@serverless-stack/resources";

new RDS(stack, "Database", {
  engine: "postgresql10.14",
  defaultDatabaseName: "my_database",
});
```



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

## RDSProps


### defaultDatabaseName

_Type_ : <span class="mono">string</span>

Name of a database which is automatically created inside the cluster.

### engine

_Type_ : <span class='mono'><span class="mono">"mysql5.6"</span> | <span class="mono">"mysql5.7"</span> | <span class="mono">"postgresql10.14"</span></span>

Database engine of the cluster. Cannot be changed once set.

### migrations?

_Type_ : <span class="mono">string</span>

Path to the directory that contains the migration scripts. The `RDS` construct uses [Kysely](https://koskimas.github.io/kysely/) to run and manage schema migrations. The `migrations` prop should point to the folder where your migration files are.



```js
new RDS(stack, "Database", {
  engine: "postgresql10.14",
  defaultDatabaseName: "acme",
  migrations: "path/to/migration/scripts",
});
```


### scaling.autoPause?

_Type_ : <span class='mono'><span class="mono">number</span> | <span class="mono">boolean</span></span>

_Default_ : <span class="mono">true</span>

The time before the cluster is paused.
Pass in true to pause after 5 minutes of inactive. And pass in false to
disable pausing.

Or pass in the number of minutes to wait before the cluster is paused.


```js
new RDS(stack, "Database", {
  scaling: {
    autoPause: props.app.stage !== "prod"
  }
})
```

### scaling.maxCapacity?

_Type_ : <span class='mono'><span class="mono">"ACU_1"</span> | <span class="mono">"ACU_2"</span> | <span class="mono">"ACU_4"</span> | <span class="mono">"ACU_8"</span> | <span class="mono">"ACU_16"</span> | <span class="mono">"ACU_32"</span> | <span class="mono">"ACU_64"</span> | <span class="mono">"ACU_128"</span> | <span class="mono">"ACU_192"</span> | <span class="mono">"ACU_256"</span> | <span class="mono">"ACU_384"</span></span>

_Default_ : <span class="mono">"ACU_16"</span>

The maximum capacity for the cluster.

### scaling.minCapacity?

_Type_ : <span class='mono'><span class="mono">"ACU_1"</span> | <span class="mono">"ACU_2"</span> | <span class="mono">"ACU_4"</span> | <span class="mono">"ACU_8"</span> | <span class="mono">"ACU_16"</span> | <span class="mono">"ACU_32"</span> | <span class="mono">"ACU_64"</span> | <span class="mono">"ACU_128"</span> | <span class="mono">"ACU_192"</span> | <span class="mono">"ACU_256"</span> | <span class="mono">"ACU_384"</span></span>

_Default_ : <span class="mono">"ACU_2"</span>

The minimum capacity for the cluster.


### types?

_Type_ : <span class="mono">string</span>

Path to place generated typescript types after running migrations



```js
new RDS(stack, "Database", {
  engine: "postgresql10.14",
  defaultDatabaseName: "acme",
  migrations: "path/to/migration/scripts",
  types: "backend/core/sql/types.ts",
});
```


### cdk.cluster?

_Type_ : <span class="mono">[RDSCdkServerlessClusterProps](#rdscdkserverlessclusterprops)</span>

Configure the internallly created RDS cluster.


```js
new RDS(stack, "Database", {
  cdk: {
    cluster: {
      clusterIdentifier: "my-cluster",
    }
  },
});
```


## Properties
An instance of `RDS` has the following properties.
### clusterArn

_Type_ : <span class="mono">string</span>

The ARN of the internally created RDS Serverless Cluster.

### clusterEndpoint

_Type_ : <span class="mono">[Endpoint](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_apigateway.Endpoint.html)</span>

The ARN of the internally created RDS Serverless Cluster.

### clusterIdentifier

_Type_ : <span class="mono">string</span>

The ARN of the internally created RDS Serverless Cluster.

### defaultDatabaseName

_Type_ : <span class="mono">string</span>

### migratorFunction?

_Type_ : <span class="mono">[Function](Function#function)</span>

The ARN of the internally created CDK ServerlessCluster instance.

### secretArn

_Type_ : <span class="mono">string</span>

The ARN of the internally created Secrets Manager Secret.


### cdk.cluster

_Type_ : <span class="mono">[ServerlessCluster](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_rds.ServerlessCluster.html)</span>

The ARN of the internally created CDK ServerlessCluster instance.


## RDSCdkServerlessClusterProps


### vpc?

_Type_ : <span class="mono">[IVpc](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_ec2.IVpc.html)</span>
