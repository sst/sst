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

### migratorFunction?

_Type_ : [`Function`](Function)

The ARN of the internally created CDK ServerlessCluster instance.

### secretArn

_Type_ : `string`

The ARN of the internally created CDK ServerlessCluster instance.

## RDSProps



### cdk.cluster?

_Type_ : [`RDSCdkServerlessClusterProps`](#rdscdkserverlessclusterprops)

Configure the internallly created RDS cluster.

#### Examples

```js
new RDS(this, "Database", {
  cdk: {
    cluster: {
      clusterIdentifier: "my-cluster",
    }
  },
});
```


### defaultDatabaseName

_Type_ : `string`

Name of a database which is automatically created inside the cluster.

### engine

_Type_ : `"mysql5.6"`&nbsp; | &nbsp;`"mysql5.7"`&nbsp; | &nbsp;`"postgresql10.14"`

Database engine of the cluster. Cannot be changed once set.

### migrations?

_Type_ : `string`

Path to the directory that contains the migration scripts. The `RDS` construct uses [Kysely](https://koskimas.github.io/kysely/) to run and manage schema migrations. The `migrations` prop should point to the folder where your migration files are.

#### Examples


```js
new RDS(this, "Database", {
  engine: "postgresql10.14",
  defaultDatabaseName: "acme",
  migrations: "path/to/migration/scripts",
});
```


### scaling.autoPause?

_Type_ : `number`&nbsp; | &nbsp;`boolean`

_Default_ : `true
`

The time before the cluster is paused.
Pass in true to pause after 5 minutes of inactive. And pass in false to
disable pausing.

Or pass in the number of minutes to wait before the cluster is paused.

#### Examples

```js
new RDS(this, "Database", {
  scaling: {
    autoPause: props.app.local,
  }
})
```

### scaling.maxCapacity?

_Type_ : `"ACU_1"`&nbsp; | &nbsp;`"ACU_2"`&nbsp; | &nbsp;`"ACU_4"`&nbsp; | &nbsp;`"ACU_8"`&nbsp; | &nbsp;`"ACU_16"`&nbsp; | &nbsp;`"ACU_32"`&nbsp; | &nbsp;`"ACU_64"`&nbsp; | &nbsp;`"ACU_128"`&nbsp; | &nbsp;`"ACU_192"`&nbsp; | &nbsp;`"ACU_256"`&nbsp; | &nbsp;`"ACU_384"`

_Default_ : `"ACU_16"
`

The maximum capacity for the cluster.

### scaling.minCapacity?

_Type_ : `"ACU_1"`&nbsp; | &nbsp;`"ACU_2"`&nbsp; | &nbsp;`"ACU_4"`&nbsp; | &nbsp;`"ACU_8"`&nbsp; | &nbsp;`"ACU_16"`&nbsp; | &nbsp;`"ACU_32"`&nbsp; | &nbsp;`"ACU_64"`&nbsp; | &nbsp;`"ACU_128"`&nbsp; | &nbsp;`"ACU_192"`&nbsp; | &nbsp;`"ACU_256"`&nbsp; | &nbsp;`"ACU_384"`

_Default_ : `"ACU_2"
`

The minimum capacity for the cluster.


## RDSCdkServerlessClusterProps


### vpc?

_Type_ : [`IVpc`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.IVpc.html)
